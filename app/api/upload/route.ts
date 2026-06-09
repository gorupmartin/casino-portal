import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore - Uploads are only used for certificate files
    const userId = parseInt(session.user.id);
    const canWrite = await hasPermission(userId, "certificates", "write");
    if (!canWrite) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ success: false, error: "File too large (max 10 MB)" }, { status: 400 });
    }

    // Strip any directory components to prevent path traversal, then whitelist the extension
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
        return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    const filename = `${Date.now()}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    try {
        await writeFile(filepath, buffer);
        console.log(`Saved file to ${filepath}`);

        // Return resource URL (relative to public)
        const fileUrl = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Error saving file:", error);
        return NextResponse.json({ success: false, error: "Failed to save file" });
    }
}
