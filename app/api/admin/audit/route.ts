import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET - Get audit logs
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: "desc" },
            take: limit,
            skip: offset
        }),
        prisma.auditLog.count({ where })
    ]);

    return NextResponse.json({ logs, total });
}
