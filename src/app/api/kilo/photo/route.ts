import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

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
      .select(["photo_data", "photo_mime_type"])
      .where("id", "=", entryId)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    if (!entry || !entry.photo_data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Convert Buffer to Uint8Array for NextResponse
    const photoBytes = new Uint8Array(entry.photo_data);

    return new NextResponse(photoBytes, {
      status: 200,
      headers: {
        "Content-Type": entry.photo_mime_type || "image/jpeg",
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
