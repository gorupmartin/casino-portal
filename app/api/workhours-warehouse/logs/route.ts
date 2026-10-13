import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET: Fetch warehouse work logs with optional filters
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    try {
        const whereClause: any = {};

        if (workerId) {
            whereClause.workerId = Number(workerId);
        }

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const logs = await prisma.warehouseWorkLog.findMany({
            where: whereClause,
            include: { worker: true },
            orderBy: [{ date: "desc" }, { id: "desc" }]
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch work logs" }, { status: 500 });
    }
}

// POST: Create new warehouse work log entry
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { workerId, date, startTime, endTime, manualOvertime, notes } = await request.json();

        // Validate: either manualOvertime OR both startTime and endTime must be provided
        const hasManualOvertime = manualOvertime !== undefined && manualOvertime !== null && manualOvertime !== "";
        const hasTimeRange = startTime && endTime;

        if (!workerId || !date) {
            return NextResponse.json({ error: "Worker and date are required" }, { status: 400 });
        }

        if (!hasManualOvertime && !hasTimeRange) {
            return NextResponse.json({ error: "Either manual overtime or start/end time is required" }, { status: 400 });
        }

        const log = await prisma.warehouseWorkLog.create({
            data: {
                workerId: Number(workerId),
                date: new Date(date),
                startTime: hasManualOvertime ? null : startTime,
                endTime: hasManualOvertime ? null : endTime,
                manualOvertime: hasManualOvertime ? Number(manualOvertime) : null,
                notes: notes || null
            },
            include: { worker: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "WarehouseWorkLog",
            recordId: log.id,
            newValue: { workerId, date, startTime, endTime, manualOvertime, notes, workerName: `${log.worker.firstName} ${log.worker.lastName}` },
            description: `Created warehouse work log for ${log.worker.firstName} ${log.worker.lastName} on ${date}${hasManualOvertime ? ' (manual entry)' : ''}`
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create work log" }, { status: 500 });
    }
}

// PUT: Update warehouse work log entry
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, startTime, endTime, manualOvertime, notes } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const hasManualOvertime = manualOvertime !== undefined && manualOvertime !== null && manualOvertime !== "";

        // Get old value
        const oldLog = await prisma.warehouseWorkLog.findUnique({
            where: { id: Number(id) },
            include: { worker: true }
        });

        const log = await prisma.warehouseWorkLog.update({
            where: { id: Number(id) },
            data: {
                startTime: hasManualOvertime ? null : startTime,
                endTime: hasManualOvertime ? null : endTime,
                manualOvertime: hasManualOvertime ? Number(manualOvertime) : null,
                notes
            },
            include: { worker: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "WarehouseWorkLog",
            recordId: log.id,
            oldValue: { startTime: oldLog?.startTime, endTime: oldLog?.endTime, manualOvertime: oldLog?.manualOvertime, notes: oldLog?.notes },
            newValue: { startTime, endTime, manualOvertime, notes },
            description: `Updated warehouse work log for ${log.worker.firstName} ${log.worker.lastName}${hasManualOvertime ? ' (manual entry)' : ''}`
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update work log" }, { status: 500 });
    }
}

// DELETE: Delete warehouse work log entry
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        // Get old value
        const oldLog = await prisma.warehouseWorkLog.findUnique({
            where: { id: Number(id) },
            include: { worker: true }
        });

        await prisma.warehouseWorkLog.delete({
            where: { id: Number(id) }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "DELETE",
            tableName: "WarehouseWorkLog",
            recordId: Number(id),
            oldValue: { workerName: oldLog ? `${oldLog.worker.firstName} ${oldLog.worker.lastName}` : null, date: oldLog?.date, startTime: oldLog?.startTime, endTime: oldLog?.endTime },
            description: `Deleted warehouse work log for ${oldLog?.worker.firstName} ${oldLog?.worker.lastName}`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete work log" }, { status: 500 });
    }
}
