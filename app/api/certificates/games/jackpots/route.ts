import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// POST: Create a Jackpot for a Game
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for certificates module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();

    try {
        const jackpot = await prisma.jackpotConfig.create({
            data: {
                gameId: Number(data.gameId),
                controllerId: Number(data.controllerId),
                initialGrand: data.initialGrand,
                initialMajor: data.initialMajor,
                minBet: data.minBet,
                maxBet: data.maxBet
            },
            include: { controller: true }
        });

        return NextResponse.json(jackpot);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create jackpot" }, { status: 500 });
    }
}

// PUT: Toggle Active Status of a Jackpot
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for certificates module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, isActive } = await request.json();

    if (!id || isActive === undefined) return NextResponse.json({ error: "ID and isActive are required" }, { status: 400 });

    try {
        const updatedJackpot = await prisma.jackpotConfig.update({
            where: { id: Number(id) },
            data: { isActive },
            include: { controller: true }
        });

        return NextResponse.json(updatedJackpot);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update jackpot status" }, { status: 500 });
    }
}
