import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { kiloEntrySchema, deleteKiloSchema, updateKiloSchema } from "@kilo/shared/schemas";
import { getAzureBlobStorage } from "@/lib/azure/client";
import { requireCompleteUserProfile } from "@/lib/data/profile";
import { encryptField, decryptField } from "@/lib/crypto";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

const PHOTO_QUESTIONS = ["q1", "q2", "q3"] as const;
type PhotoQuestion = (typeof PHOTO_QUESTIONS)[number];

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
async function parseKiloBody(request: NextRequest): Promise<{
  fields: Record<string, unknown>;
  photoFiles: Record<PhotoQuestion, File | null>;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  const emptyPhotos: Record<PhotoQuestion, File | null> = { q1: null, q2: null, q3: null };

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fields: Record<string, unknown> = {};
    const photoFiles = { ...emptyPhotos };

    for (const [key, value] of formData.entries()) {
      // Handle per-question photo fields
      if (key === "q1_photo" || key === "q2_photo" || key === "q3_photo") {
        const q = key.replace("_photo", "") as PhotoQuestion;
        photoFiles[q] = value as File;
        continue;
      }
      // Legacy single "photo" field maps to q1
      if (key === "photo") {
        photoFiles.q1 = value as File;
        continue;
      }
      // Parse stringified values back to proper types
      if (value === "null") fields[key] = null;
      else if (value === "true") fields[key] = true;
      else if (value === "false") fields[key] = false;
      else if (key === "id") fields[key] = Number(value);
      else fields[key] = value;
    }

    return { fields, photoFiles };
  }

  // JSON fallback
  const body = await request.json();
  return { fields: body, photoFiles: { ...emptyPhotos } };
}

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);
    await requireCompleteUserProfile(user.id);

    const { fields, photoFiles } = await parseKiloBody(request);
    const parsed = kiloEntrySchema.safeParse(fields);

    if (!parsed.success) {
      console.error("[POST /api/kilo] Validation failed for user:", user.id, "Issues:", JSON.stringify(parsed.error.issues));
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q1, q2, q3, q4, location, q1_photo_path, q2_photo_path, q3_photo_path } = parsed.data;

    // Upload photo files to blob storage
    const resolvedPhotoPaths: Record<PhotoQuestion, string | null> = {
      q1: q1_photo_path ?? null,
      q2: q2_photo_path ?? null,
      q3: q3_photo_path ?? null,
    };

    for (const q of PHOTO_QUESTIONS) {
      const file = photoFiles[q];
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        resolvedPhotoPaths[q] = await uploadPhotoToBlob(buffer, file.type, user.username);
      }
    }

    const newEntry = await db
      .insertInto("kilo")
      .values({
        user_id: user.id,
        q1: encryptField(q1),
        q2: encryptField(q2),
        q3: encryptField(q3),
        q4: encryptField(q4),
        location: location ?? null,
        q1_photo_path: resolvedPhotoPaths.q1,
        q2_photo_path: resolvedPhotoPaths.q2,
        q3_photo_path: resolvedPhotoPaths.q3,
      })
      .returning(["id", "q1", "q2", "q3", "q4", "location", "q1_photo_path", "q2_photo_path", "q3_photo_path", "created_at"])
      .executeTakeFirst();

    // Decrypt fields before returning to client
    const decryptedEntry = newEntry
      ? { ...newEntry, q1: decryptField(newEntry.q1), q2: decryptField(newEntry.q2), q3: decryptField(newEntry.q3), q4: decryptField(newEntry.q4) }
      : newEntry;

    return NextResponse.json({ entry: decryptedEntry }, { status: 201 });
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

  const SELECT_COLS = ["id", "q1", "q2", "q3", "q4", "location", "q1_photo_path", "q2_photo_path", "q3_photo_path", "created_at"] as const;

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
        .select([...SELECT_COLS])
        .where("id", "=", entryId)
        .where("user_id", "=", user.id)
        .executeTakeFirst();

      if (!entry) {
        return NextResponse.json(
          { error: "Entry not found or not authorized" },
          { status: 404 }
        );
      }

      const decryptedEntry = {
        ...entry,
        q1: decryptField(entry.q1),
        q2: decryptField(entry.q2),
        q3: decryptField(entry.q3),
        q4: decryptField(entry.q4),
      };

      return NextResponse.json({ entry: decryptedEntry }, { status: 200 });
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
      .select([...SELECT_COLS])
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

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    const decryptedEntries = entries.map((entry) => ({
      ...entry,
      q1: decryptField(entry.q1),
      q2: decryptField(entry.q2),
      q3: decryptField(entry.q3),
      q4: decryptField(entry.q4),
    }));

    return NextResponse.json({ entries: decryptedEntries, total, page, totalPages });
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

    // Fetch photo paths before deleting for file cleanup
    const existing = await db
      .selectFrom("kilo")
      .select(["q1_photo_path", "q2_photo_path", "q3_photo_path"])
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

    // Clean up photo blobs
    if (existing) {
      const photoPaths = [existing.q1_photo_path, existing.q2_photo_path, existing.q3_photo_path];
      await Promise.all(
        photoPaths.filter(Boolean).map((path) => deletePhotoBlob(path!))
      );
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
    await requireCompleteUserProfile(user.id);

    const { fields, photoFiles } = await parseKiloBody(request);
    const parsed = updateKiloSchema.safeParse(fields);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, q1, q2, q3, q4, location, q1_photo_path, q2_photo_path, q3_photo_path, keep_q1_photo, keep_q2_photo, keep_q3_photo } = parsed.data;

    // Build update object — encrypt text fields at rest
    const updateData: Record<string, unknown> = {
      q1: encryptField(q1),
      q2: encryptField(q2),
      q3: encryptField(q3),
      q4: encryptField(q4),
      location: location ?? null,
    };

    // Fetch old photo paths for cleanup
    const existing = await db
      .selectFrom("kilo")
      .select(["q1_photo_path", "q2_photo_path", "q3_photo_path"])
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    const keepFlags: Record<PhotoQuestion, boolean | undefined> = {
      q1: keep_q1_photo,
      q2: keep_q2_photo,
      q3: keep_q3_photo,
    };

    const schemaPhotoPaths: Record<PhotoQuestion, string | null | undefined> = {
      q1: q1_photo_path,
      q2: q2_photo_path,
      q3: q3_photo_path,
    };

    const oldPhotoPaths: Record<PhotoQuestion, string | null> = {
      q1: existing?.q1_photo_path ?? null,
      q2: existing?.q2_photo_path ?? null,
      q3: existing?.q3_photo_path ?? null,
    };

    // Handle each photo independently
    for (const q of PHOTO_QUESTIONS) {
      if (keepFlags[q]) {
        // Keep existing photo — don't update
        continue;
      }

      // Upload new file if provided
      const file = photoFiles[q];
      let resolvedPath = schemaPhotoPaths[q] ?? null;
      if (file && file.size > 0) {
        resolvedPath = await uploadPhotoToBlob(Buffer.from(await file.arrayBuffer()), file.type, user.username);
      }

      updateData[`${q}_photo_path`] = resolvedPath;
    }

    // Update the entry only if it belongs to the user
    const updatedEntry = await db
      .updateTable("kilo")
      .set(updateData)
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .returning(["id", "q1", "q2", "q3", "q4", "location", "q1_photo_path", "q2_photo_path", "q3_photo_path", "created_at"])
      .executeTakeFirst();

    if (!updatedEntry) {
      return NextResponse.json(
        { error: "Entry not found or not authorized" },
        { status: 404 }
      );
    }

    // Clean up old photos that were replaced or cleared
    for (const q of PHOTO_QUESTIONS) {
      const oldPath = oldPhotoPaths[q];
      const newPath = updatedEntry[`${q}_photo_path`];
      if (oldPath && oldPath !== newPath) {
        await deletePhotoBlob(oldPath);
      }
    }

    // Decrypt fields before returning to client
    const decryptedEntry = {
      ...updatedEntry,
      q1: decryptField(updatedEntry.q1),
      q2: decryptField(updatedEntry.q2),
      q3: decryptField(updatedEntry.q3),
      q4: decryptField(updatedEntry.q4),
    };

    return NextResponse.json({ entry: decryptedEntry }, { status: 200 });
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
