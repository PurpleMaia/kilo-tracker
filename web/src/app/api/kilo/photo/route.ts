import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getAzureBlobStorage } from "@/lib/azure/client";

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

    // photo_path is the full Azure blob URL — extract the blob path
    const { container } = getAzureBlobStorage();
    const blobUrl = new URL(entry.photo_path);
    const containerPrefix = `/${process.env.AZURE_STORAGE_CONTAINER_NAME}/`;
    if (!blobUrl.pathname.startsWith(containerPrefix)) {
      return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
    }
    const blobPath = blobUrl.pathname.slice(containerPrefix.length);
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    const downloadResponse = await blockBlobClient.download(0);
    if (!downloadResponse.readableStreamBody) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Read the stream into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": downloadResponse.contentType || "image/jpeg",
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
