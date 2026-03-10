import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

const kiloEntrySchema = z.object({
  q1: z.string().min(1, "Question 1 is required"),
  q2: z.string().nullable().optional(),
  q3: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  photo_base64: z.string().nullable().optional(),
  photo_mime_type: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || VALID_MIME_TYPES.includes(val),
      "Invalid image type"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = kiloEntrySchema.safeParse(body);

    if (!parsed.success) {
      console.log("[POST /api/kilo] Validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: "Invalid input \n Issues: " + parsed.error.issues.map(issue => issue.message).join(", ")},
        { status: 400 }
      );
    }

    const { q1, q2, q3, location, photo_base64, photo_mime_type } = parsed.data;

    // Convert base64 to buffer if photo is provided
    let photoData: Buffer | null = null;
    if (photo_base64 && photo_mime_type) {
      const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, "");
      photoData = Buffer.from(base64Data, "base64");

      if (photoData.length > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { error: "Photo too large (max 5MB)" },
          { status: 400 }
        );
      }
    }

    const newEntry = await db
      .insertInto("kilo")
      .values({
        user_id: user.id,
        q1,
        q2: q2 ?? null,
        q3: q3 ?? null,
        location: location ?? null,
        photo_data: photoData,
        photo_mime_type: photo_mime_type ?? null,
      })
      .returning(["id", "q1", "q2", "q3", "location", "created_at"])
      .executeTakeFirst();

    // Add has_photo flag to response
    const entryWithPhoto = {
      ...newEntry,
      has_photo: !!photoData,
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
        .select(["id", "q1", "q2", "q3", "location", "photo_data", "created_at"])
        .where("id", "=", entryId)
        .where("user_id", "=", user.id)
        .executeTakeFirst();

      if (!entry) {
        return NextResponse.json(
          { error: "Entry not found or not authorized" },
          { status: 404 }
        );
      }

      // Return has_photo flag instead of the actual data
      const { photo_data, ...rest } = entry;
      const entryWithPhoto = {
        ...rest,
        has_photo: !!photo_data,
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
    const [entries, countResult] = await Promise.all([
      db
        .selectFrom("kilo")
        .select(["id", "q1", "q2", "q3", "location", "photo_data", "created_at"])
        .where("user_id", "=", user.id)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute(),
      db
        .selectFrom("kilo")
        .select(({ fn }) => fn.count<number>("id").as("total"))
        .where("user_id", "=", user.id)
        .executeTakeFirst(),
    ]);

    // Map entries to include has_photo flag instead of actual data
    const entriesWithPhotoFlag = entries.map(({ photo_data, ...rest }) => ({
      ...rest,
      has_photo: !!photo_data,
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

const deleteKiloSchema = z.object({
  id: z.number().int().positive("Invalid entry ID"),
});

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

const updateKiloSchema = kiloEntrySchema.extend({
  id: z.number().int().positive("Invalid entry ID"),
  keep_photo: z.boolean().optional(), // If true, don't update photo
});

export async function PUT(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = updateKiloSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, q1, q2, q3, location, photo_base64, photo_mime_type, keep_photo } = parsed.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      q1,
      q2: q2 ?? null,
      q3: q3 ?? null,
      location: location ?? null,
    };

    // Only update photo if not keeping existing and new photo provided
    if (!keep_photo) {
      if (photo_base64 && photo_mime_type) {
        const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, "");
        const photoData = Buffer.from(base64Data, "base64");

        if (photoData.length > MAX_PHOTO_SIZE) {
          return NextResponse.json(
            { error: "Photo too large (max 5MB)" },
            { status: 400 }
          );
        }

        updateData.photo_data = photoData;
        updateData.photo_mime_type = photo_mime_type;
      } else {
        // Clear photo if no new photo and not keeping
        updateData.photo_data = null;
        updateData.photo_mime_type = null;
      }
    }

    // Update the entry only if it belongs to the user
    const updatedEntry = await db
      .updateTable("kilo")
      .set(updateData)
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .returning(["id", "q1", "q2", "q3", "location", "photo_data", "created_at"])
      .executeTakeFirst();

    if (!updatedEntry) {
      return NextResponse.json(
        { error: "Entry not found or not authorized" },
        { status: 404 }
      );
    }

    // Return has_photo flag instead of actual data
    const { photo_data, ...rest } = updatedEntry;
    const entryWithPhoto = {
      ...rest,
      has_photo: !!photo_data,
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