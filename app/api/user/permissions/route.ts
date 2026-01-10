import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get current user's permissions
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // @ts-ignore
    const userId = parseInt(session.user?.id);

    if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions.map(p => ({
            module: p.module,
            canView: p.canView,
            canWrite: p.canWrite
        }))
    });
}
