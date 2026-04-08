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

    const existing = await db
      .selectFrom("profiles")
      .selectAll()
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    const {
      first_name,
      last_name,
      dob,
      mauna,
      aina,
      wai,
      kula,
      role,
      consent_privacy_ack,
      share_kilo_entries,
      encrypt_kilo_entries,
    } = parsed.data;
    const dobDate = dob !== undefined ? (dob ? new Date(dob) : null) : existing?.dob ?? null;

    // Generate a stable UUID for this user's profile (only used on insert)
    const profileId = crypto.randomUUID();

    const profile = await db
      .insertInto("profiles")
      .values({
        id: profileId,
        user_id: user.id,
        first_name: first_name ?? existing?.first_name ?? null,
        last_name: last_name ?? existing?.last_name ?? null,
        dob: dobDate,
        mauna: mauna ?? existing?.mauna ?? null,
        aina: aina ?? existing?.aina ?? null,
        wai: wai ?? existing?.wai ?? null,
        kula: kula ?? existing?.kula ?? null,
        role: role ?? existing?.role ?? null,
        consent_privacy_ack: consent_privacy_ack ?? existing?.consent_privacy_ack ?? null,
        share_kilo_entries: share_kilo_entries ?? existing?.share_kilo_entries ?? null,
        encrypt_kilo_entries: encrypt_kilo_entries ?? existing?.encrypt_kilo_entries ?? null,
      })
      .onConflict((oc) =>
        oc.column("user_id").doUpdateSet({
          // Note: id is NOT updated on conflict - it stays the same
          first_name: first_name ?? existing?.first_name ?? null,
          last_name: last_name ?? existing?.last_name ?? null,
          dob: dobDate,
          mauna: mauna ?? existing?.mauna ?? null,
          aina: aina ?? existing?.aina ?? null,
          wai: wai ?? existing?.wai ?? null,
          kula: kula ?? existing?.kula ?? null,
          role: role ?? existing?.role ?? null,
          consent_privacy_ack: consent_privacy_ack ?? existing?.consent_privacy_ack ?? null,
          share_kilo_entries: share_kilo_entries ?? existing?.share_kilo_entries ?? null,
          encrypt_kilo_entries: encrypt_kilo_entries ?? existing?.encrypt_kilo_entries ?? null,
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
