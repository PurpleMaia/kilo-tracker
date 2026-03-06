import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

const kiloEntrySchema = z.object({
  q1: z.string().min(1, "Question 1 is required"),
  q2: z.string().nullable().optional(),
  q3: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const entries = await db
      .selectFrom("kilo")
      .select(["id", "q1", "q2", "q3", "location", "created_at"])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .limit(20)
      .execute();

    return NextResponse.json({ entries });
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

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = kiloEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q1, q2, q3, location } = parsed.data;

    const newEntry = await db
      .insertInto("kilo")
      .values({
        user_id: user.id,
        q1,
        q2: q2 ?? null,
        q3: q3 ?? null,
        location: location ?? null,
      })
      .returning(["id", "q1", "q2", "q3", "location", "created_at"])
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
