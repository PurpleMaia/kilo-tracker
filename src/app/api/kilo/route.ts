import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

// Regex pattern for valid photo paths: /uploads/kilo/{userId}/{timestamp}-{userId.slice(0,8)}.{ext}
const PHOTO_PATH_PATTERN = /^\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.(jpg|jpeg|png|gif|webp)$/i;

const kiloEntrySchema = z.object({
  q1: z.string().min(1, "Question 1 is required"),
  q2: z.string().nullable().optional(),
  q3: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  photo_path: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || PHOTO_PATH_PATTERN.test(val),
      "Invalid photo path format"
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

    const { q1, q2, q3, location, photo_path } = parsed.data;

    const newEntry = await db
      .insertInto("kilo")
      .values({
        user_id: user.id,
        q1,
        q2: q2 ?? null,
        q3: q3 ?? null,
        location: location ?? null,
        photo_path: photo_path ?? null,
      })
      .returning(["id", "q1", "q2", "q3", "location", "photo_path", "created_at"])
      .executeTakeFirst();

    return NextResponse.json({ entry: newEntry }, { status: 201 });
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

      return NextResponse.json({ entry }, { status: 200 });
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
        .select(["id", "q1", "q2", "q3", "location", "photo_path", "created_at"])
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

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ entries, total, page, totalPages });
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

    const { id, q1, q2, q3, location, photo_path } = parsed.data;

    // Update the entry only if it belongs to the user
    const updatedEntry = await db
      .updateTable("kilo")
      .set({
        q1,
        q2: q2 ?? null,
        q3: q3 ?? null,
        location: location ?? null,
        photo_path: photo_path ?? null,
      })
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

    return NextResponse.json({ entry: updatedEntry }, { status: 200 });
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