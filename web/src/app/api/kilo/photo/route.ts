import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { readFile } from "fs/promises";
import path from "path";

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    }

    const entryId = Number(id);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    }

    const entry = await db
      .selectFrom("kilo")
      .select(["photo_path"])
      .where("id", "=", entryId)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    if (!entry || !entry.photo_path) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Path traversal protection
    const fullPath = path.resolve(process.cwd(), entry.photo_path);
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (!fullPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
    }

    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const mimeType = EXT_TO_MIME[ext] || "image/jpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/kilo/photo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
