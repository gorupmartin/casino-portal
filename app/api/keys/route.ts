import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    try {
        const keys = await prisma.key.findMany({
            where: search
                ? {
                    keyCode: { contains: search }
                }
                : {},
            include: {
                assignments: {
                    include: {
                        location: true,
                        keyType: true,
                        cabinetPosition: true
                    }
                }
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
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { keyCode, silverCount, goldCount, brokenSilver, brokenGold } = body;

        const newKey = await prisma.key.create({
            data: {
                keyCode,
                silverCount: parseInt(silverCount) || 0,
                goldCount: parseInt(goldCount) || 0,
                brokenSilver: parseInt(brokenSilver) || 0,
                brokenGold: parseInt(brokenGold) || 0,
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
            newValue: { keyCode, silverCount, goldCount, brokenSilver, brokenGold },
            description: `Created key "${keyCode}"`
        });

        return NextResponse.json(newKey);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Failed to create key" }, { status: 500 });
    }
}
