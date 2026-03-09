import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Whitelist of allowed image extensions
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

// Map MIME types to safe extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No photo provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // Validate file type - must be a known image MIME type
    const safeExt = MIME_TO_EXT[file.type];
    if (!safeExt) {
      return NextResponse.json(
        { error: "Only JPG, PNG, GIF, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // Double-check: validate file extension from filename against whitelist
    const clientExt = file.name.split(".").pop()?.toLowerCase();
    if (clientExt && !ALLOWED_EXTENSIONS.includes(clientExt)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename using safe extension derived from MIME type
    const filename = `${Date.now()}-${user.id.slice(0, 8)}.${safeExt}`;

    // Save to public/uploads/kilo/{userId}/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "kilo", user.id);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    if (process.env.NODE_ENV !== "production") console.log("[POST /api/photo] Uploaded photo to", `/uploads/kilo/${user.id}/${filename}`);

    return NextResponse.json({ path: `/uploads/kilo/${user.id}/${filename}` });
  } catch (error) {
    console.error("[POST /api/photo]", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}