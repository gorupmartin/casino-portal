import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // 'unassigned' or undefined

    try {
        const whereClause: any = {};

        if (search) {
            whereClause.keyCode = { contains: search };
        }

        if (status === 'unassigned') {
            whereClause.assignments = { none: {} };
        }

        const keys = await prisma.key.findMany({
            where: whereClause,
            include: {
                assignments: {
                    include: {
                        location: true,
                        cabinetPosition: true,
                        keyType: true
                    }
                }
            },
            orderBy: { id: "desc" },
        });
        return NextResponse.json(keys);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
    }
}

// POST: Create New Key OR Add Stock to Existing
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { keyCode, silverCount, goldCount, brokenSilver, brokenGold } = await request.json();

        // Check if key already exists
        const existingKey = await prisma.key.findUnique({
            where: { keyCode }
        });

        if (existingKey) {
            // Update existing stock
            const updatedKey = await prisma.key.update({
                where: { keyCode },
                data: {
                    silverCount: { increment: parseInt(silverCount || 0) },
                    goldCount: { increment: parseInt(goldCount || 0) },
                    // Typically we don't add broken keys directly via this form, but we could allow it.
                    // For now, let's assume this form adds GOOD stock.
                }
            });
            return NextResponse.json(updatedKey);
        } else {
            // Create new key
            const newKey = await prisma.key.create({
                data: {
                    keyCode,
                    silverCount: parseInt(silverCount || 0),
                    goldCount: parseInt(goldCount || 0),
                    brokenSilver: parseInt(brokenSilver || 0),
                    brokenGold: parseInt(brokenGold || 0),
                },
            });
            return NextResponse.json(newKey);
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create key" }, { status: 500 });
    }
}

// PUT: Report Broken Key
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for keys module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "keys", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, type, count } = await request.json(); // type: 'SILVER' or 'GOLD', count: number

        const key = await prisma.key.findUnique({ where: { id } });
        if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

        if (type === 'SILVER') {
            if (key.silverCount < count) {
                return NextResponse.json({ error: "Not enough silver keys to mark as broken" }, { status: 400 });
            }
            const updated = await prisma.key.update({
                where: { id },
                data: {
                    silverCount: { decrement: count },
                    brokenSilver: { increment: count }
                }
            });

            return NextResponse.json(updated);
        } else if (type === 'GOLD') {
            if (key.goldCount < count) {
                return NextResponse.json({ error: "Not enough gold keys to mark as broken" }, { status: 400 });
            }
            const updated = await prisma.key.update({
                where: { id },
                data: {
                    goldCount: { decrement: count },
                    brokenGold: { increment: count }
                }
            });

            return NextResponse.json(updated);
        } else {
            return NextResponse.json({ error: "Invalid key type" }, { status: 400 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update key" }, { status: 500 });
    }
}
