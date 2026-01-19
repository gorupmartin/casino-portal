import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const types = await prisma.locationType.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: { name: 'asc' }
    });
    return NextResponse.json(types);
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
        const type = await prisma.locationType.create({ data: { name } });
        return NextResponse.json(type);
    } catch (error: any) {
        console.error("Error creating location type:", error);
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

    // Validation: Check against LOCATIONS table (not assignments directly)
    if (isActive === false) {
        const usageCount = await prisma.location.count({ where: { locationTypeId: id } });
        if (usageCount > 0) {
            return NextResponse.json({ error: "Cannot block: Location Type is in use." }, { status: 400 });
        }
    }

    const updated = await prisma.locationType.update({
        where: { id },
        data: { isActive }
    });
    return NextResponse.json(updated);
}
