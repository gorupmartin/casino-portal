import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// GET - Get single user
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...safeUser } = user;
    return NextResponse.json(safeUser);
}

// PUT - Update user
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    try {
        // Get old user data for audit
        const oldUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: true }
        });

        const body = await request.json();
        const { username, password, role, isActive, permissions } = body;

        // Build update data
        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Update permissions if provided
        if (permissions && Array.isArray(permissions)) {
            // Delete existing permissions
            await prisma.userPermission.deleteMany({
                where: { userId }
            });

            // Create new permissions
            for (const perm of permissions) {
                await prisma.userPermission.create({
                    data: {
                        userId,
                        module: perm.module,
                        canView: perm.canView || false,
                        canWrite: perm.canWrite || false
                    }
                });
            }
        }

        // Fetch updated user with permissions
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: true }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        const changes: string[] = [];
        if (username !== undefined && oldUser?.username !== username) changes.push(`username: ${oldUser?.username} → ${username}`);
        if (role !== undefined && oldUser?.role !== role) changes.push(`role: ${oldUser?.role} → ${role}`);
        if (isActive !== undefined && oldUser?.isActive !== isActive) changes.push(`isActive: ${oldUser?.isActive} → ${isActive}`);
        if (password) changes.push("password changed");
        if (permissions) changes.push("permissions updated");

        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "User",
            recordId: userId,
            oldValue: { username: oldUser?.username, role: oldUser?.role, isActive: oldUser?.isActive, permissions: oldUser?.permissions },
            newValue: { username: updatedUser?.username, role: updatedUser?.role, isActive: updatedUser?.isActive, permissions: updatedUser?.permissions },
            description: `Updated user "${oldUser?.username}": ${changes.join(", ")}`
        });

        const { password: _, ...safeUser } = updatedUser!;
        return NextResponse.json(safeUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}

// DELETE - Delete user
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    try {
        // Prevent deleting yourself
        // @ts-ignore
        if (session.user?.id === userId) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        // Get user data for audit before deleting
        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: true }
        });

        await prisma.user.delete({
            where: { id: userId }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "DELETE",
            tableName: "User",
            recordId: userId,
            oldValue: { username: userToDelete?.username, role: userToDelete?.role },
            description: `Deleted user "${userToDelete?.username}"`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
