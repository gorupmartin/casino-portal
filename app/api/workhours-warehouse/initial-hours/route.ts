import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET: Fetch initial hours for all or one worker
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");

    try {
        if (workerId) {
            const initialHours = await prisma.warehouseInitialHours.findUnique({
                where: { workerId: Number(workerId) },
                include: { worker: true }
            });
            return NextResponse.json(initialHours);
        }

        const allInitialHours = await prisma.warehouseInitialHours.findMany({
            include: { worker: true }
        });

        return NextResponse.json(allInitialHours);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch initial hours" }, { status: 500 });
    }
}

// POST: Set/update initial hours for a worker
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { workerId, hours } = await request.json();

        if (!workerId) {
            return NextResponse.json({ error: "Worker ID required" }, { status: 400 });
        }

        // Get old value
        const oldHours = await prisma.warehouseInitialHours.findUnique({
            where: { workerId: Number(workerId) },
            include: { worker: true }
        });

        // Upsert: create if not exists, update if exists
        const initialHours = await prisma.warehouseInitialHours.upsert({
            where: { workerId: Number(workerId) },
            update: { hours: Number(hours) || 0 },
            create: {
                workerId: Number(workerId),
                hours: Number(hours) || 0
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
            action: oldHours ? "UPDATE" : "CREATE",
            tableName: "WarehouseInitialHours",
            recordId: initialHours.id,
            oldValue: oldHours ? { hours: oldHours.hours } : null,
            newValue: { hours: Number(hours) || 0 },
            description: `${oldHours ? "Updated" : "Set"} initial hours for warehouse worker ${initialHours.worker.firstName} ${initialHours.worker.lastName}: ${oldHours?.hours || 0} → ${hours}`
        });

        return NextResponse.json(initialHours);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to set initial hours" }, { status: 500 });
    }
}
