import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// GET: Fetch Certificates with linked data
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const showBlocked = searchParams.get("showBlocked") === "true";
    const hr = searchParams.get("hr") === "true";
    const slo = searchParams.get("slo") === "true";

    try {
        const whereClause: any = {};

        // Search Filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { game: { name: { contains: search } } },
                { board: { name: { contains: search } } },
                { cabinets: { some: { cabinet: { name: { contains: search } } } } }
            ];
        }

        // Active/Blocked Filter
        if (!showBlocked) {
            whereClause.isActive = true;
        }

        // Region Filters
        if (hr) whereClause.recognizedHr = true;
        if (slo) whereClause.forSlovenia = true;

        const certificates = await prisma.certificateDefinition.findMany({
            where: whereClause,
            include: {
                game: true,
                board: true,
                cabinets: {
                    include: {
                        cabinet: true
                    }
                }
            },
            orderBy: {
                id: "desc",
            },
        });
        return NextResponse.json(certificates);
    } catch (error) {
        console.error("Error fetching certificates:", error);
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
    }
}

// POST: Create a new Certificate
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for certificates module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { name, recognizedHr, forSlovenia, filePath, gameId, boardId, cabinetIds } = body;

        // Validation: Unique Name
        const existing = await prisma.certificateDefinition.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ error: "Certificate with this name/number already exists." }, { status: 409 });
        }

        const certificate = await prisma.certificateDefinition.create({
            data: {
                name,
                recognizedHr,
                forSlovenia,
                filePath,
                gameId: Number(gameId),
                boardId: Number(boardId),
                cabinets: {
                    create: cabinetIds.map((cid: any) => ({
                        cabinetId: Number(cid)
                    }))
                }
            },
            include: {
                game: true,
                board: true,
                cabinets: { include: { cabinet: true } }
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
            tableName: "CertificateDefinition",
            recordId: certificate.id,
            newValue: { name, game: certificate.game.name, board: certificate.board.name, recognizedHr, forSlovenia },
            description: `Created certificate "${name}" for game ${certificate.game.name}`
        });

        return NextResponse.json(certificate);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Failed to create certificate" }, { status: 500 });
    }
}

// PUT: Update a Certificate (Block/Unblock, Edit specific fields, Update Cabinets)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for certificates module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, isActive, recognizedHr, forSlovenia, filePath, cabinetIds } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Get old data
        const oldCert = await prisma.certificateDefinition.findUnique({
            where: { id: Number(id) },
            include: { cabinets: { select: { cabinetId: true } } }
        });

        // Prepare update data
        const updateData: any = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (recognizedHr !== undefined) updateData.recognizedHr = recognizedHr;
        if (forSlovenia !== undefined) updateData.forSlovenia = forSlovenia;
        if (filePath !== undefined) updateData.filePath = filePath;

        // If cabinetIds provided, update the cabinets
        if (cabinetIds !== undefined && Array.isArray(cabinetIds)) {
            // Delete all existing cabinet relations
            await prisma.certificateCabinet.deleteMany({
                where: { certificateId: Number(id) }
            });

            // Create new cabinet relations
            if (cabinetIds.length > 0) {
                await prisma.certificateCabinet.createMany({
                    data: cabinetIds.map((cabId: number) => ({
                        certificateId: Number(id),
                        cabinetId: cabId
                    }))
                });
            }
        }

        const certificate = await prisma.certificateDefinition.update({
            where: { id: Number(id) },
            data: updateData,
            include: { cabinets: { include: { cabinet: true } } }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        const changes: string[] = [];
        if (isActive !== undefined && oldCert?.isActive !== isActive) changes.push(`isActive: ${oldCert?.isActive} → ${isActive}`);
        if (recognizedHr !== undefined && oldCert?.recognizedHr !== recognizedHr) changes.push(`recognizedHr: ${recognizedHr}`);
        if (forSlovenia !== undefined && oldCert?.forSlovenia !== forSlovenia) changes.push(`forSlovenia: ${forSlovenia}`);
        if (filePath !== undefined) changes.push("filePath updated");
        if (cabinetIds !== undefined) changes.push(`cabinets updated (${cabinetIds.length} cabinets)`);

        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "UPDATE",
            tableName: "CertificateDefinition",
            recordId: Number(id),
            oldValue: { isActive: oldCert?.isActive, recognizedHr: oldCert?.recognizedHr, forSlovenia: oldCert?.forSlovenia, cabinets: oldCert?.cabinets.map(c => c.cabinetId) },
            newValue: { ...updateData, cabinetIds },
            description: `Updated certificate "${oldCert?.name}": ${changes.join(", ")}`
        });

        return NextResponse.json(certificate);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update certificate" }, { status: 500 });
    }
}

// DELETE: Delete a Certificate
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Check if user has write permission for certificates module
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        // Get old data
        const oldCert = await prisma.certificateDefinition.findUnique({
            where: { id: Number(id) },
            include: { game: true }
        });

        await prisma.certificateDefinition.delete({
            where: { id: Number(id) }
        });

        // Audit log
        // @ts-ignore
        const actorUsername = session.user?.username || session.user?.name || "unknown";
        await createAuditLog({
            // @ts-ignore
            userId: parseInt(session.user?.id) || undefined,
            username: actorUsername,
            action: "DELETE",
            tableName: "CertificateDefinition",
            recordId: Number(id),
            oldValue: { name: oldCert?.name, game: oldCert?.game?.name },
            description: `Deleted certificate "${oldCert?.name}"`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
