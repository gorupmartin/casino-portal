import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET: Fetch work logs with optional filters
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get("technicianId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    try {
        const whereClause: any = {};

        if (technicianId) {
            whereClause.technicianId = Number(technicianId);
        }

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const logs = await prisma.workLog.findMany({
            where: whereClause,
            include: { technician: true },
            orderBy: [{ date: "desc" }, { id: "desc" }]
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch work logs" }, { status: 500 });
    }
}

// POST: Create new work log entry
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { technicianId, date, startTime, endTime, manualOvertime, notes } = await request.json();

        // Validate: either manualOvertime OR both startTime and endTime must be provided
        const hasManualOvertime = manualOvertime !== undefined && manualOvertime !== null && manualOvertime !== "";
        const hasTimeRange = startTime && endTime;

        if (!technicianId || !date) {
            return NextResponse.json({ error: "Technician and date are required" }, { status: 400 });
        }

        if (!hasManualOvertime && !hasTimeRange) {
            return NextResponse.json({ error: "Either manual overtime or start/end time is required" }, { status: 400 });
        }

        const log = await prisma.workLog.create({
            data: {
                technicianId: Number(technicianId),
                date: new Date(date),
                startTime: hasManualOvertime ? null : startTime,
                endTime: hasManualOvertime ? null : endTime,
                manualOvertime: hasManualOvertime ? Number(manualOvertime) : null,
                notes: notes || null
            },
            include: { technician: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "WorkLog",
            recordId: log.id,
            newValue: { technicianId, date, startTime, endTime, manualOvertime, notes, technicianName: `${log.technician.firstName} ${log.technician.lastName}` },
            description: `Created work log for ${log.technician.firstName} ${log.technician.lastName} on ${date}${hasManualOvertime ? ' (manual entry)' : ''}`
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create work log" }, { status: 500 });
    }
}

// PUT: Update work log entry
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, startTime, endTime, manualOvertime, notes } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const hasManualOvertime = manualOvertime !== undefined && manualOvertime !== null && manualOvertime !== "";

        // Get old value
        const oldLog = await prisma.workLog.findUnique({
            where: { id: Number(id) },
            include: { technician: true }
        });

        const log = await prisma.workLog.update({
            where: { id: Number(id) },
            data: {
                startTime: hasManualOvertime ? null : startTime,
                endTime: hasManualOvertime ? null : endTime,
                manualOvertime: hasManualOvertime ? Number(manualOvertime) : null,
                notes
            },
            include: { technician: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "WorkLog",
            recordId: log.id,
            oldValue: { startTime: oldLog?.startTime, endTime: oldLog?.endTime, manualOvertime: oldLog?.manualOvertime, notes: oldLog?.notes },
            newValue: { startTime, endTime, manualOvertime, notes },
            description: `Updated work log for ${log.technician.firstName} ${log.technician.lastName}${hasManualOvertime ? ' (manual entry)' : ''}`
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update work log" }, { status: 500 });
    }
}

// DELETE: Delete work log entry
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        // Get old value
        const oldLog = await prisma.workLog.findUnique({
            where: { id: Number(id) },
            include: { technician: true }
        });

        await prisma.workLog.delete({
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
            tableName: "WorkLog",
            recordId: Number(id),
            oldValue: { technicianName: oldLog ? `${oldLog.technician.firstName} ${oldLog.technician.lastName}` : null, date: oldLog?.date, startTime: oldLog?.startTime, endTime: oldLog?.endTime },
            description: `Deleted work log for ${oldLog?.technician.firstName} ${oldLog?.technician.lastName}`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete work log" }, { status: 500 });
    }
}
