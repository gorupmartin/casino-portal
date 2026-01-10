import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// GET: Fetch initial hours for all or one technician
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get("technicianId");

    try {
        if (technicianId) {
            const initialHours = await prisma.initialHours.findUnique({
                where: { technicianId: Number(technicianId) },
                include: { technician: true }
            });
            return NextResponse.json(initialHours);
        }

        const allInitialHours = await prisma.initialHours.findMany({
            include: { technician: true }
        });

        return NextResponse.json(allInitialHours);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch initial hours" }, { status: 500 });
    }
}

// POST: Set/update initial hours for a technician
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { technicianId, hours } = await request.json();

        if (!technicianId) {
            return NextResponse.json({ error: "Technician ID required" }, { status: 400 });
        }

        // Get old value
        const oldHours = await prisma.initialHours.findUnique({
            where: { technicianId: Number(technicianId) },
            include: { technician: true }
        });

        // Upsert: create if not exists, update if exists
        const initialHours = await prisma.initialHours.upsert({
            where: { technicianId: Number(technicianId) },
            update: { hours: Number(hours) || 0 },
            create: {
                technicianId: Number(technicianId),
                hours: Number(hours) || 0
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
            action: oldHours ? "UPDATE" : "CREATE",
            tableName: "InitialHours",
            recordId: initialHours.id,
            oldValue: oldHours ? { hours: oldHours.hours } : null,
            newValue: { hours: Number(hours) || 0 },
            description: `${oldHours ? "Updated" : "Set"} initial hours for ${initialHours.technician.firstName} ${initialHours.technician.lastName}: ${oldHours?.hours || 0} → ${hours}`
        });

        return NextResponse.json(initialHours);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to set initial hours" }, { status: 500 });
    }
}
