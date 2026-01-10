import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// GET: Fetch all games with their jackpots and controllers
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { version: { contains: search } },
            { renoId: { contains: search } }
        ];
    }

    try {
        const games = await prisma.gameDefinition.findMany({
            where,
            include: {
                jackpots: {
                    include: {
                        controller: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });
        return NextResponse.json(games);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
    }
}

// POST: Create a new Game
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();

    try {
        const game = await prisma.gameDefinition.create({
            data: {
                name: data.name,
                version: data.version,
                renoId: data.renoId,
                isActive: true
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
            tableName: "GameDefinition",
            recordId: game.id,
            newValue: { name: data.name, version: data.version, renoId: data.renoId },
            description: `Created game "${data.name}" v${data.version}`
        });

        return NextResponse.json(game);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create game" }, { status: 500 });
    }
}

// PUT: Update Game Details
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, jackpots, ...data } = await request.json();

    try {
        // Get old data
        const oldGame = await prisma.gameDefinition.findUnique({ where: { id: Number(id) } });

        const updatedGame = await prisma.gameDefinition.update({
            where: { id: Number(id) },
            data: data
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "GameDefinition",
            recordId: Number(id),
            oldValue: { name: oldGame?.name, version: oldGame?.version, isActive: oldGame?.isActive },
            newValue: data,
            description: `Updated game "${oldGame?.name}"`
        });

        return NextResponse.json(updatedGame);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update game" }, { status: 500 });
    }
}
