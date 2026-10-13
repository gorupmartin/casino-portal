import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET: Fetch all warehouse workers
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    try {
        const whereClause: any = {};

        if (search) {
            whereClause.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } }
            ];
        }

        if (activeOnly) {
            whereClause.isActive = true;
        }

        const workers = await prisma.warehouseWorker.findMany({
            where: whereClause,
            include: {
                initialHours: true
            },
            orderBy: { lastName: "asc" }
        });

        return NextResponse.json(workers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 });
    }
}

// POST: Create new warehouse worker
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { firstName, lastName } = await request.json();

        if (!firstName || !lastName) {
            return NextResponse.json({ error: "First name and last name required" }, { status: 400 });
        }

        const worker = await prisma.warehouseWorker.create({
            data: { firstName, lastName }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "WarehouseWorker",
            recordId: worker.id,
            newValue: { firstName, lastName },
            description: `Created warehouse worker "${firstName} ${lastName}"`
        });

        return NextResponse.json(worker);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
    }
}

// PUT: Update warehouse worker (block/unblock)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for workhours_warehouse module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "workhours_warehouse", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, isActive } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Get old value
        const oldWorker = await prisma.warehouseWorker.findUnique({ where: { id: Number(id) } });

        const worker = await prisma.warehouseWorker.update({
            where: { id: Number(id) },
            data: { isActive }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "WarehouseWorker",
            recordId: worker.id,
            oldValue: { isActive: oldWorker?.isActive },
            newValue: { isActive },
            description: `${isActive ? "Activated" : "Deactivated"} warehouse worker "${worker.firstName} ${worker.lastName}"`
        });

        return NextResponse.json(worker);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
    }
}
