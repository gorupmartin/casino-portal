import prisma from "./prisma";

interface AuditLogParams {
    userId?: number;
    username: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "BLOCK" | "UNBLOCK";
    tableName: string;
    recordId?: number;
    oldValue?: any;
    newValue?: any;
    description?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                username: params.username,
                action: params.action,
                tableName: params.tableName,
                recordId: params.recordId,
                oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
                newValue: params.newValue ? JSON.stringify(params.newValue) : null,
                description: params.description
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw - audit logging should not break the main operation
    }
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(options?: {
    tableName?: string;
    action?: string;
    userId?: number;
    limit?: number;
    offset?: number;
}) {
    const where: any = {};

    if (options?.tableName) {
        where.tableName = options.tableName;
    }
    if (options?.action) {
        where.action = options.action;
    }
    if (options?.userId) {
        where.userId = options.userId;
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: "desc" },
            take: options?.limit || 50,
            skip: options?.offset || 0
        }),
        prisma.auditLog.count({ where })
    ]);

    return { logs, total };
}
