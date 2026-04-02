import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { profileUpdateSchema } from "@kilo/shared/schemas";

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
    const dobDate = dob ? new Date(dob) : null;

    // Generate a stable UUID for this user's profile (only used on insert)
    const profileId = crypto.randomUUID();

    const profile = await db
      .insertInto("profiles")
      .values({
        id: profileId,
        user_id: user.id,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        dob: dobDate,
        mauna: mauna ?? null,
        aina: aina ?? null,
        wai: wai ?? null,
        kula: kula ?? null,
        role: role ?? null,
      })
      .onConflict((oc) =>
        oc.column("user_id").doUpdateSet({
          // Note: id is NOT updated on conflict - it stays the same
          first_name: first_name ?? null,
          last_name: last_name ?? null,
          dob: dobDate,
          mauna: mauna ?? null,
          aina: aina ?? null,
          wai: wai ?? null,
          kula: kula ?? null,
          role: role ?? null,
        })
      )
      .returningAll()
      .executeTakeFirst();

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[PUT /api/profile]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
