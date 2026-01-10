import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// GET: Fetch all technicians
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

        const technicians = await prisma.technician.findMany({
            where: whereClause,
            include: {
                initialHours: true
            },
            orderBy: { lastName: "asc" }
        });

        return NextResponse.json(technicians);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
    }
}

// POST: Create new technician
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { firstName, lastName } = await request.json();

        if (!firstName || !lastName) {
            return NextResponse.json({ error: "First name and last name required" }, { status: 400 });
        }

        const technician = await prisma.technician.create({
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
            tableName: "Technician",
            recordId: technician.id,
            newValue: { firstName, lastName },
            description: `Created technician "${firstName} ${lastName}"`
        });

        return NextResponse.json(technician);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create technician" }, { status: 500 });
    }
}

// PUT: Update technician (block/unblock)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, isActive } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Get old value
        const oldTech = await prisma.technician.findUnique({ where: { id: Number(id) } });

        const technician = await prisma.technician.update({
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
            tableName: "Technician",
            recordId: technician.id,
            oldValue: { isActive: oldTech?.isActive },
            newValue: { isActive },
            description: `${isActive ? "Activated" : "Deactivated"} technician "${technician.firstName} ${technician.lastName}"`
        });

        return NextResponse.json(technician);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update technician" }, { status: 500 });
    }
}
