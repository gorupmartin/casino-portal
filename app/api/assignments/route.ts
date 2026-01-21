import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// GET: Fetch all assignments
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const typeId = searchParams.get("typeId");

    try {
        const whereClause: any = {};

        if (search) {
            whereClause.OR = [
                { location: { name: { contains: search } } },
                { key: { keyCode: { contains: search } } }
            ];
        }

        if (typeId) {
            whereClause.location = {
                ...whereClause.location,
                locationTypeId: Number(typeId)
            };
        }

        const assignments = await prisma.keyAssignment.findMany({
            where: whereClause,
            include: {
                location: { include: { locationType: true } },
                key: true,
                keyType: true,
                cabinetPosition: true
            },
            orderBy: { id: "desc" },
        });
        return NextResponse.json(assignments);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }
}

// POST: Create new assignment
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { keyId, locationId, cabinetPositionId, keyTypeId } = body;

        // Validation: Check if Key is already assigned
        const existingKeyAssignment = await prisma.keyAssignment.findFirst({
            where: { keyId: parseInt(keyId) }
        });
        if (existingKeyAssignment) {
            return NextResponse.json({ error: "Key is already assigned." }, { status: 409 });
        }

        // Validation: Check if Position is taken anywhere (Global Cabinet)
        const existingPositionAssignment = await prisma.keyAssignment.findFirst({
            where: {
                cabinetPositionId: parseInt(cabinetPositionId)
            }
        });
        if (existingPositionAssignment) {
            return NextResponse.json({ error: "Cabinet Position is already in use (Global)." }, { status: 409 });
        }

        const assignment = await prisma.keyAssignment.create({
            data: {
                keyId: parseInt(keyId),
                locationId: parseInt(locationId),
                cabinetPositionId: parseInt(cabinetPositionId),
                keyTypeId: parseInt(keyTypeId)
            },
            include: {
                key: true,
                location: true,
                cabinetPosition: true,
                keyType: true
            }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "KeyAssignment",
            recordId: assignment.id,
            newValue: { keyCode: assignment.key.keyCode, location: assignment.location.name, position: assignment.cabinetPosition.name, keyType: assignment.keyType.name },
            description: `Assigned key "${assignment.key.keyCode}" to ${assignment.location.name} at ${assignment.cabinetPosition.name}`
        });

        return NextResponse.json(assignment);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create assignment" }, { status: 500 });
    }
}

// DELETE: Remove assignment
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await request.json();

        // Get old data for audit
        const oldAssignment = await prisma.keyAssignment.findUnique({
            where: { id: parseInt(id) },
            include: { key: true, location: true, cabinetPosition: true }
        });

        const deleted = await prisma.keyAssignment.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "DELETE",
            tableName: "KeyAssignment",
            recordId: parseInt(id),
            oldValue: { keyCode: oldAssignment?.key.keyCode, location: oldAssignment?.location.name, position: oldAssignment?.cabinetPosition.name },
            description: `Removed assignment of key "${oldAssignment?.key.keyCode}" from ${oldAssignment?.location.name}`
        });

        return NextResponse.json(deleted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete assignment" }, { status: 500 });
    }
}
