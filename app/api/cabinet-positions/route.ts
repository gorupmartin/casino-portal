import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const positions = await prisma.cabinetPosition.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: { name: 'asc' }
    });
    return NextResponse.json(positions);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name } = await request.json();
        const pos = await prisma.cabinetPosition.create({ data: { name } });
        return NextResponse.json(pos);
    } catch (error: any) {
        console.error("Error creating cabinet position:", error);
        return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, isActive } = await request.json();

    // Validation: Cannot block if used in KeyAssignment
    if (isActive === false) {
        const usageCount = await prisma.keyAssignment.count({ where: { cabinetPositionId: id } });
        if (usageCount > 0) {
            return NextResponse.json({ error: "Cannot block: Position is in use." }, { status: 400 });
        }
    }

    const updated = await prisma.cabinetPosition.update({
        where: { id },
        data: { isActive }
    });
    return NextResponse.json(updated);
}
