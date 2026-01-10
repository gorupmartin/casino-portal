import prisma from "./prisma";

export type Module = "keys" | "certificates" | "workhours";
export type Permission = "view" | "write";

export interface UserPermissionData {
    module: Module;
    canView: boolean;
    canWrite: boolean;
}

/**
 * Check if user has specific permission for a module
 */
export async function hasPermission(
    userId: number,
    module: Module,
    permission: Permission
): Promise<boolean> {
    // Get user with role
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
    });

    if (!user || !user.isActive) return false;

    // ADMIN has all permissions
    if (user.role === "ADMIN") return true;

    // Find permission for this module
    const modulePermission = user.permissions.find(p => p.module === module);

    if (!modulePermission) return false;

    if (permission === "view") {
        return modulePermission.canView;
    } else {
        return modulePermission.canWrite;
    }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: number): Promise<UserPermissionData[]> {
    const permissions = await prisma.userPermission.findMany({
        where: { userId }
    });

    return permissions.map(p => ({
        module: p.module as Module,
        canView: p.canView,
        canWrite: p.canWrite
    }));
}

/**
 * Set permissions for a user (replaces existing)
 */
export async function setUserPermissions(
    userId: number,
    permissions: UserPermissionData[]
): Promise<void> {
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
                canView: perm.canView,
                canWrite: perm.canWrite
            }
        });
    }
}

/**
 * Get user with permissions by username (for session)
 */
export async function getUserWithPermissions(username: string) {
    return prisma.user.findUnique({
        where: { username },
        include: { permissions: true }
    });
}
