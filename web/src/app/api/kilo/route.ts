import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { kiloEntrySchema, deleteKiloSchema, updateKiloSchema } from "@kilo/shared/schemas";
import { getAzureBlobStorage } from "@/lib/azure/client";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

async function uploadPhotoToBlob(
  buffer: Buffer,
  mimeType: string,
  username: string,
): Promise<string> {
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new AppError("PHOTO_TOO_LARGE", 400, "Photo too large (max 5MB)");
  }

  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new AppError("UNSUPPORTED_IMAGE_TYPE", 400, "Unsupported image type");
  }

  const folderName = username.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const timestamp = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  };
  const readableTimestamp = timestamp.toLocaleString("en-US", opts).replace(/[/,:\s]/g, "-");
  const filename = `${readableTimestamp}.${ext}`;

  const { container } = getAzureBlobStorage();
  const blobPath = `kilo/${folderName}/${filename}`;
  const blockBlobClient = container.getBlockBlobClient(blobPath);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return blockBlobClient.url;
}

/** Parse request body — supports both JSON and multipart/form-data */
async function parseKiloBody(request: NextRequest): Promise<{ fields: Record<string, unknown>; photoFile: File | null }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fields: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "photo") continue; // handle separately
      // Parse stringified values back to proper types
      if (value === "null") fields[key] = null;
      else if (value === "true") fields[key] = true;
      else if (value === "false") fields[key] = false;
      else if (key === "id") fields[key] = Number(value);
      else fields[key] = value;
    }

    const photoFile = formData.get("photo") as File | null;
    return { fields, photoFile };
  }

  // JSON fallback
  const body = await request.json();
  return { fields: body, photoFile: null };
}

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const { fields, photoFile } = await parseKiloBody(request);
    const parsed = kiloEntrySchema.safeParse(fields);

    if (!parsed.success) {
      console.error("[POST /api/kilo] Validation failed for user:", user.id, "Issues:", JSON.stringify(parsed.error.issues));
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q1, q2, q3, location, photo_path } = parsed.data;

    // Upload photo file to blob storage if provided
    let resolvedPhotoPath = photo_path ?? null;
    if (photoFile && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      resolvedPhotoPath = await uploadPhotoToBlob(buffer, photoFile.type, user.username);
    }

    const newEntry = await db
      .insertInto("kilo")
      .values({
        user_id: user.id,
        q1,
        q2: q2 ?? null,
        q3: q3 ?? null,
        location: location ?? null,
        photo_path: resolvedPhotoPath,
      })
      .returning(["id", "q1", "q2", "q3", "location", "created_at"])
      .executeTakeFirst();

    // Add has_photo flag to response
    const entryWithPhoto = {
      ...newEntry,
      has_photo: !!resolvedPhotoPath,
    };

    return NextResponse.json({ entry: entryWithPhoto }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/kilo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
 
const PAGE_SIZE = 5;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const dateParam = searchParams.get("date");

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE))));
  const offset = (page - 1) * limit;

  const isEditing = !!id;

  // If ID provided, return single entry (editing)
  if (isEditing) {
    const entryId = Number(id);
    if (isNaN(entryId)) {
      return NextResponse.json(
        { error: "Invalid entry ID" },
        { status: 400 }
      );
    }

    try {
      const user = await validateSession(request);

      const entry = await db
        .selectFrom("kilo")
        .select(["id", "q1", "q2", "q3", "location", "photo_path", "created_at"])
        .where("id", "=", entryId)
        .where("user_id", "=", user.id)
        .executeTakeFirst();

      if (!entry) {
        return NextResponse.json(
          { error: "Entry not found or not authorized" },
          { status: 404 }
        );
      }

      // Return has_photo flag instead of the path
      const { photo_path, ...rest } = entry;
      const entryWithPhoto = {
        ...rest,
        has_photo: !!photo_path,
      };

      return NextResponse.json({ entry: entryWithPhoto }, { status: 200 });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      console.error("[GET /api/kilo?id=]", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Otherwise return paginated list of entries
  try {
    const user = await validateSession(request);
    // Client timezone offset in minutes from Date.getTimezoneOffset()
    // Positive for west of UTC (e.g. 600 for HST/UTC-10)
    const tzOffset = parseInt(searchParams.get("tz") ?? "0");
    const offsetMs = isNaN(tzOffset) ? 0 : tzOffset * 60 * 1000;

    // Build date range filter if date param provided
    let dateStart: Date | null = null;
    let dateEnd: Date | null = null;
    if (dateParam) {
      // Convert client local midnight to UTC: midnight local + offset = UTC
      const dayStartUtc = new Date(dateParam + "T00:00:00Z");
      if (isNaN(dayStartUtc.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
      }
      dateStart = new Date(dayStartUtc.getTime() + offsetMs);
      dateEnd = new Date(dayStartUtc.getTime() + offsetMs + 86400000); // +1 day
    }

    let entriesQuery = db
      .selectFrom("kilo")
      .select(["id", "q1", "q2", "q3", "location", "photo_path", "created_at"])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    let countQuery = db
      .selectFrom("kilo")
      .select(({ fn }) => fn.count<number>("id").as("total"))
      .where("user_id", "=", user.id);

    if (dateStart && dateEnd) {
      entriesQuery = entriesQuery
        .where("created_at", ">=", dateStart)
        .where("created_at", "<", dateEnd);
      countQuery = countQuery
        .where("created_at", ">=", dateStart)
        .where("created_at", "<", dateEnd);
    }

    const [entries, countResult] = await Promise.all([
      entriesQuery.execute(),
      countQuery.executeTakeFirst(),
    ]);

    // Map entries to include has_photo flag instead of path
    const entriesWithPhotoFlag = entries.map(({ photo_path, ...rest }) => ({
      ...rest,
      has_photo: !!photo_path,
    }));

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ entries: entriesWithPhotoFlag, total, page, totalPages });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/kilo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = deleteKiloSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // Fetch photo path before deleting for file cleanup
    const existing = await db
      .selectFrom("kilo")
      .select(["photo_path"])
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    // Delete the entry only if it belongs to the user
    const result = await db
      .deleteFrom("kilo")
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .execute();

    if (Number(result[0].numDeletedRows) === 0) {
      return NextResponse.json(
        { error: "Entry not found or not authorized" },
        { status: 404 }
      );
    }

    // Clean up photo file from disk
    if (existing?.photo_path) {
      await deletePhotoBlob(existing.photo_path);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[DELETE /api/kilo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/** Best-effort delete of a photo blob from Azure Storage */
async function deletePhotoBlob(photoUrl: string) {
  try {
    const { container } = getAzureBlobStorage();
    // Extract blob path from full URL: https://<account>.blob.core.windows.net/<container>/<blob-path>
    const url = new URL(photoUrl);
    // pathname is /<container>/<blob-path>, strip the leading /<container>/
    const containerPrefix = `/${process.env.AZURE_STORAGE_CONTAINER_NAME}/`;
    if (!url.pathname.startsWith(containerPrefix)) return;
    const blobPath = url.pathname.slice(containerPrefix.length);
    await container.getBlockBlobClient(blobPath).deleteIfExists();
  } catch {
    // Blob may already be gone — ignore
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const { fields, photoFile } = await parseKiloBody(request);
    const parsed = updateKiloSchema.safeParse(fields);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, q1, q2, q3, location, photo_path, keep_photo } = parsed.data;

    // Upload photo file to blob storage if provided
    let resolvedPhotoPath = photo_path ?? null;
    if (photoFile && photoFile.size > 0) {
      resolvedPhotoPath = await uploadPhotoToBlob(Buffer.from(await photoFile.arrayBuffer()), photoFile.type, user.username);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      q1,
      q2: q2 ?? null,
      q3: q3 ?? null,
      location: location ?? null,
    };

    // Fetch old photo path for cleanup if replacing/clearing
    let oldPhotoPath: string | null = null;
    if (!keep_photo) {
      const existing = await db
        .selectFrom("kilo")
        .select(["photo_path"])
        .where("id", "=", id)
        .where("user_id", "=", user.id)
        .executeTakeFirst();
      oldPhotoPath = existing?.photo_path ?? null;
    }

    // Only update photo if not keeping existing
    if (!keep_photo) {
      updateData.photo_path = resolvedPhotoPath;
    }

    // Update the entry only if it belongs to the user
    const updatedEntry = await db
      .updateTable("kilo")
      .set(updateData)
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .returning(["id", "q1", "q2", "q3", "location", "photo_path", "created_at"])
      .executeTakeFirst();

    if (!updatedEntry) {
      return NextResponse.json(
        { error: "Entry not found or not authorized" },
        { status: 404 }
      );
    }

    // Clean up old file if photo was replaced or cleared
    if (oldPhotoPath && oldPhotoPath !== updatedEntry.photo_path) {
      await deletePhotoBlob(oldPhotoPath);
    }

    // Return has_photo flag instead of path
    const { photo_path: photoPath, ...rest } = updatedEntry;
    const entryWithPhoto = {
      ...rest,
      has_photo: !!photoPath,
    };

    return NextResponse.json({ entry: entryWithPhoto }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[PUT /api/kilo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}