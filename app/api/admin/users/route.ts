import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET - List all users with permissions
export async function GET() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
        include: { permissions: true },
        orderBy: { createdAt: "desc" }
    });

    // Remove password from response
    const safeUsers = users.map(({ password, ...rest }) => rest);

    return NextResponse.json(safeUsers);
}

// POST - Create new user
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { username, password, role, isActive, permissions } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Check if username exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || "VIEWER",
                isActive: isActive !== false
            }
        });

        // Create permissions if provided
        if (permissions && Array.isArray(permissions)) {
            for (const perm of permissions) {
                await prisma.userPermission.create({
                    data: {
                        userId: user.id,
                        module: perm.module,
                        canView: perm.canView || false,
                        canWrite: perm.canWrite || false
                    }
                });
            }
        }

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "CREATE",
            tableName: "User",
            recordId: user.id,
            newValue: { username, role, isActive: isActive !== false, permissions },
            description: `Created user "${username}" with role ${role || "VIEWER"}`
        });

        // Return user without password
        const { password: _, ...safeUser } = user;
        return NextResponse.json(safeUser, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
