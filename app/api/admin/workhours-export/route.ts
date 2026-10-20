import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExcelJS from "exceljs";

// Prevent caching in production
export const dynamic = 'force-dynamic';

interface Log {
    id: number;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    manualOvertime: unknown;
    notes: string | null;
}

interface Worker {
    firstName: string;
    lastName: string;
    initialHours: { hours: unknown } | null;
    workLogs: Log[];
}

// Same rule as the summary endpoints: manualOvertime, otherwise (end - start) - 8h
function logDifference(log: Log): number {
    if (log.manualOvertime !== null && log.manualOvertime !== undefined) {
        return Number(log.manualOvertime);
    }
    if (log.startTime && log.endTime) {
        const [startH, startM] = log.startTime.split(':').map(Number);
        const [endH, endM] = log.endTime.split(':').map(Number);
        return ((endH * 60 + endM) - (startH * 60 + startM)) / 60 - 8;
    }
    return 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Excel has no time zones: store the Zagreb wall-clock time as a "UTC" date
function toZagrebWallClock(date: Date): Date {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Zagreb",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
}

// GET - Export both working-hours modules to Excel for a date range
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(from) || !datePattern.test(to) || from > to) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Log dates are stored as UTC midnight ("YYYY-MM-DD" parsed by new Date)
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDateExclusive = new Date(`${to}T00:00:00.000Z`);
    toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

    try {
        const workerOrder = [{ lastName: "asc" as const }, { firstName: "asc" as const }];
        const [warehouseWorkers, technicians, auditEntries] = await Promise.all([
            prisma.warehouseWorker.findMany({
                where: { isActive: true },
                include: { initialHours: true, workLogs: { where: { date: { lt: toDateExclusive } } } },
                orderBy: workerOrder
            }),
            prisma.technician.findMany({
                where: { isActive: true },
                include: { initialHours: true, workLogs: { where: { date: { lt: toDateExclusive } } } },
                orderBy: workerOrder
            }),
            prisma.auditLog.findMany({
                where: { action: "CREATE", tableName: { in: ["WarehouseWorkLog", "WorkLog"] } },
                select: { tableName: true, recordId: true, timestamp: true, username: true }
            })
        ]);

        // Work logs have no createdAt / author columns; take them from the audit log
        const created = new Map<string, { timestamp: Date; username: string }>();
        for (const entry of auditEntries) {
            created.set(`${entry.tableName}:${entry.recordId}`, entry);
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Sati");
        sheet.columns = [
            { header: "Modul", key: "module", width: 12 },
            { header: "Radnik", key: "worker", width: 24 },
            { header: "Vrsta", key: "type", width: 15 },
            { header: "Datum", key: "date", width: 12, style: { numFmt: "dd.mm.yyyy" } },
            { header: "Početak", key: "start", width: 9 },
            { header: "Kraj", key: "end", width: 9 },
            { header: "Razlika (h)", key: "diff", width: 12, style: { numFmt: "0.00" } },
            { header: "Saldo (h)", key: "balance", width: 12, style: { numFmt: "0.00" } },
            { header: "Napomena", key: "notes", width: 40 },
            { header: "Upisano", key: "createdAt", width: 17, style: { numFmt: "dd.mm.yyyy hh:mm" } },
            { header: "Upisao", key: "createdBy", width: 15 }
        ];
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        const addWorker = (moduleName: string, tableName: string, worker: Worker) => {
            const name = `${worker.lastName} ${worker.firstName}`;
            const logs = [...worker.workLogs].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id);

            let balance = worker.initialHours?.hours ? Number(worker.initialHours.hours) : 0;
            for (const log of logs) {
                if (log.date < fromDate) balance += logDifference(log);
            }

            sheet.addRow({
                module: moduleName,
                worker: name,
                type: "Početno stanje",
                date: fromDate,
                balance: round2(balance)
            });

            for (const log of logs) {
                if (log.date < fromDate) continue;
                const diff = logDifference(log);
                balance += diff;
                const audit = created.get(`${tableName}:${log.id}`);
                sheet.addRow({
                    module: moduleName,
                    worker: name,
                    type: "Upis",
                    date: log.date,
                    start: log.startTime ?? undefined,
                    end: log.endTime ?? undefined,
                    diff: round2(diff),
                    balance: round2(balance),
                    notes: log.notes ?? undefined,
                    createdAt: audit ? toZagrebWallClock(audit.timestamp) : undefined,
                    createdBy: audit?.username
                });
            }
        };

        warehouseWorkers.forEach(w => addWorker("Skladište", "WarehouseWorkLog", w));
        technicians.forEach(t => addWorker("Tehnika", "WorkLog", t));

        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer as ArrayBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="WorkingHours_${from}_${to}.xlsx"`
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to export working hours" }, { status: 500 });
    }
}
