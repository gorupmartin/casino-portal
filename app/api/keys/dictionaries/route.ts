import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

// Helper function to map dictionary type to Prisma model delegate
const getModel = (type: string) => {
    switch (type) {
        case "location-type": return prisma.locationType;
        case "position": return prisma.cabinetPosition;
        case "key-type": return prisma.keyType;
        default: return null;
    }
};

const getTableName = (type: string) => {
    switch (type) {
        case "location-type": return "LocationType";
        case "position": return "CabinetPosition";
        case "key-type": return "KeyType";
        default: return type;
    }
};

// GET: Fetch all items for a dictionary type
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const model: any = getModel(type);
    if (!model) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    try {
        const where: any = {};
        if (search) {
            where.name = { contains: search };
        }

        const items = await model.findMany({
            where,
            orderBy: { id: "desc" }
        });

        return NextResponse.json(items);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}

// POST: Create a new item
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, ...data } = await request.json();

    if (!type) return NextResponse.json({ error: "Type is required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        const newItem = await model.create({
            data
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: getTableName(type),
            recordId: newItem.id,
            newValue: data,
            description: `Created ${type} "${data.name}"`
        });

        return NextResponse.json(newItem);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 500 });
    }
}

// PUT: Update an item
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id, isActive, ...data } = await request.json();

    if (!type || !id) return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        // Get old data for audit
        const oldItem = await model.findUnique({ where: { id: Number(id) } });

        // If blocking (isActive = false), check for usage
        if (isActive === false) {
            let usageCount = 0;
            switch (type) {
                case "location-type":
                    usageCount = await prisma.location.count({ where: { locationTypeId: Number(id) } });
                    break;
                case "position":
                    usageCount = await prisma.keyAssignment.count({ where: { cabinetPositionId: Number(id) } });
                    break;
                case "key-type":
                    usageCount = await prisma.keyAssignment.count({ where: { keyTypeId: Number(id) } });
                    break;
            }

            if (usageCount > 0) {
                return NextResponse.json({ error: `Cannot block item because it is currently used by ${usageCount} entities.` }, { status: 409 });
            }
        }

        const updateData: any = { ...data };
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedItem = await model.update({
            where: { id: Number(id) },
            data: updateData
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        const action = isActive !== undefined ? (isActive ? "UNBLOCK" : "BLOCK") : "UPDATE";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: action,
            tableName: getTableName(type),
            recordId: Number(id),
            oldValue: oldItem,
            newValue: updateData,
            description: `${action === "BLOCK" ? "Blocked" : action === "UNBLOCK" ? "Unblocked" : "Updated"} ${type} "${oldItem?.name || id}"`
        });

        return NextResponse.json(updatedItem);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
    }
}

// DELETE: Delete an item
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        // Get old data for audit
        const oldItem = await model.findUnique({ where: { id: Number(id) } });

        await model.delete({
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
            tableName: getTableName(type),
            recordId: Number(id),
            oldValue: oldItem,
            description: `Deleted ${type} "${oldItem?.name || id}"`
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Cannot delete item because it is used (foreign key constraint)." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
    }
}
