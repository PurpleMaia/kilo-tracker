import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

function emptyToUndefined(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const profileUpdateSchema = z.object({
  first_name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  last_name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  dob: z.preprocess(emptyToUndefined, z.string().date().optional()),
  mauna: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  aina: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  wai: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  kula: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  role: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
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
    const dobDate = dob ? new Date(dob) : null;

    const profile = await db
      .insertInto("profiles")
      .values({
        id: crypto.randomUUID(),
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
