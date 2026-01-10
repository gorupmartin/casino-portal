import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false, error: "No file uploaded" });
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

    // Sanitize filename to prevent issues (simple timestamp prefix)
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
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
