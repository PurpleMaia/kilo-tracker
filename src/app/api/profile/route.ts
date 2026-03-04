import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

const profileUpdateSchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  dob: z.string().min(1),
  mauna: z.string().min(1).trim(),
  aina: z.string().min(1).trim(),
  wai: z.string().min(1).trim(),
  kula: z.string().min(1).trim(),
  role: z.string().min(1).trim(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const profile = await db
      .selectFrom("profiles")
      .selectAll()
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    return NextResponse.json({ profile: profile ?? null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[GET /api/profile]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { first_name, last_name, dob, mauna, aina, wai, kula, role } = parsed.data;

    const existing = await db
      .selectFrom("profiles")
      .select("id")
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    let profile;
    if (existing) {
      profile = await db
        .updateTable("profiles")
        .set({ first_name, last_name, dob: new Date(dob), mauna, aina, wai, kula, role })
        .where("user_id", "=", user.id)
        .returningAll()
        .executeTakeFirst();
    } else {
      profile = await db
        .insertInto("profiles")
        .values({
          id: crypto.randomUUID(),
          user_id: user.id,
          first_name,
          last_name,
          dob: new Date(dob),
          mauna,
          aina,
          wai,
          kula,
          role,
        })
        .returningAll()
        .executeTakeFirst();
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[PUT /api/profile]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
