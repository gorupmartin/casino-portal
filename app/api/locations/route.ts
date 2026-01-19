import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
    try {
        const locations = await prisma.location.findMany({
            include: { locationType: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(locations);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { name, locationTypeId } = body;

        const location = await prisma.location.create({
            data: {
                name,
                locationTypeId: parseInt(locationTypeId),
                status: "OPEN"
            },
            include: { locationType: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "Location",
            recordId: location.id,
            newValue: { name, locationType: location.locationType.name },
            description: `Created location "${name}" (${location.locationType.name})`
        });

        return NextResponse.json(location);
    } catch (error: any) {
        console.error("Error creating location:", error);
        return NextResponse.json({ error: error.message || "Failed to create location" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status } = body;

        // Get old data
        const oldLocation = await prisma.location.findUnique({ where: { id } });

        // Validation: Cannot close if used in KeyAssignment
        if (status === 'CLOSED') {
            const usageCount = await prisma.keyAssignment.count({ where: { locationId: id } });
            if (usageCount > 0) {
                return NextResponse.json({ error: "Cannot close location with active key assignments." }, { status: 400 });
            }
        }

        const location = await prisma.location.update({
            where: { id },
            data: { status },
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "Location",
            recordId: id,
            oldValue: { status: oldLocation?.status },
            newValue: { status },
            description: `${status === 'CLOSED' ? 'Closed' : 'Opened'} location "${location.name}"`
        });

        return NextResponse.json(location);
    } catch (error: any) {
        console.error("Error updating location:", error);
        return NextResponse.json({ error: error.message || "Failed to update location" }, { status: 500 });
    }
}
