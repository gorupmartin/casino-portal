
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const getModel = (type: string) => {
    switch (type) {
        case "certificate": return prisma.certificateDefinition;
        case "board": return prisma.boardDefinition;
        case "cabinet": return prisma.cabinetDefinition;
        case "game": return prisma.gameDefinition;
        case "controller": return prisma.controllerDefinition;
        default: return null;
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
            if (type === "game") {
                where.OR = [
                    { name: { contains: search } },
                    { version: { contains: search } },
                    { renoId: { contains: search } }
                ];
            } else if (type === "board") {
                where.OR = [
                    { name: { contains: search } },
                    { biosName: { contains: search } }
                ];
            } else if (type === "cabinet") {
                where.OR = [
                    { name: { contains: search } },
                    { drawerType: { contains: search } }
                ];
            } else if (type === "certificate") {
                where.OR = [
                    { name: { contains: search } },
                    { filePath: { contains: search } }
                ];
            } else if (type === "controller") {
                where.OR = [
                    { name: { contains: search } },
                    { version: { contains: search } }
                ];
            } else {
                where.name = { contains: search };
            }
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
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, ...data } = await request.json();

    if (!type) return NextResponse.json({ error: "Type is required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        const newItem = await model.create({
            data: {
                ...data,
                isActive: true // Default to active on create
            }
        });

        return NextResponse.json(newItem);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 500 });
    }
}

// PUT: Update an item (Block/Unblock)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id, isActive, ...data } = await request.json();

    if (!type || !id) return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        // Validation: If blocking, check usage in CertificateCabinet
        if (isActive === false) {
            let whereClause: any = {};

            if (type === "certificate") whereClause = { certificateId: Number(id) };
            else if (type === "cabinet") whereClause = { cabinetId: Number(id) };

            if (type === "controller") {
                const usageCount = await prisma.jackpotConfig.count({ where: { controllerId: Number(id) } });
                if (usageCount > 0) {
                    return NextResponse.json({ error: `Cannot block item because it is currently used in ${usageCount} jackpot configurations.` }, { status: 409 });
                }
            } else if (type === "board") {
                // Boards are linked directly to CertificateDefinition
                const usageCount = await prisma.certificateDefinition.count({ where: { boardId: Number(id) } });
                if (usageCount > 0) {
                    return NextResponse.json({ error: `Cannot block item because it is currently used in ${usageCount} certificates.` }, { status: 409 });
                }
            } else if (type === "game") {
                // Games are linked directly to CertificateDefinition
                const usageCount = await prisma.certificateDefinition.count({ where: { gameId: Number(id) } });
                if (usageCount > 0) {
                    return NextResponse.json({ error: `Cannot block item because it is currently used in ${usageCount} certificates.` }, { status: 409 });
                }
            } else if (type === "certificate" || type === "cabinet") {
                const usageCount = await prisma.certificateCabinet.count({ where: whereClause });
                if (usageCount > 0) {
                    return NextResponse.json({ error: `Cannot block item because it is currently used in ${usageCount} certificate-cabinet links.` }, { status: 409 });
                }
            }
        }

        const updateData: any = { ...data };
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedItem = await model.update({
            where: { id: Number(id) },
            data: updateData
        });
        return NextResponse.json(updatedItem);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
    }
}

// DELETE: Delete an item
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });

    const model: any = getModel(type);
    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    try {
        await model.delete({
            where: { id: Number(id) }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Cannot delete item because it is used in a combination." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
    }
}
