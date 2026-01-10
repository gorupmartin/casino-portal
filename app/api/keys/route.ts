import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    try {
        const keys = await prisma.key.findMany({
            where: search
                ? {
                    OR: [
                        { keyCode: { contains: search } },
                        { location: { name: { contains: search } } },
                        { keyType: { name: { contains: search } } },
                    ],
                }
                : {},
            include: {
                location: true,
                keyType: true,
            },
            orderBy: {
                id: "desc",
            },
        });
        return NextResponse.json(keys);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { keyCode, silverCount, goldCount, brokenCount, position, locationId, keyTypeId } = body;

        const newKey = await prisma.key.create({
            data: {
                keyCode,
                silverCount: parseInt(silverCount),
                goldCount: parseInt(goldCount),
                brokenCount: parseInt(brokenCount || 0),
                position,
                locationId: parseInt(locationId),
                keyTypeId: keyTypeId ? parseInt(keyTypeId) : null,
            },
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "Key",
            recordId: newKey.id,
            newValue: { keyCode, silverCount, goldCount, brokenCount, position },
            description: `Created key "${keyCode}"`
        });

        return NextResponse.json(newKey);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Failed to create key" }, { status: 500 });
    }
}
