import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await validateSession(request);

    const todayISO = new Date().toISOString().split("T")[0];

    // Count total entries
    const countResult = await db
      .selectFrom("olelo_noeau")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .executeTakeFirst();

    const totalCount = Number(countResult?.count ?? 0);

    if (totalCount === 0) {
      return NextResponse.json({ data: null, date: todayISO });
    }

    // Calculate today's selection using UTC-based day
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const offset = daysSinceEpoch % totalCount;

    // Fetch using offset (handles ID gaps from deletions)
    const olelo = await db
      .selectFrom("olelo_noeau")
      .select(["id", "text"])
      .orderBy("id", "asc")
      .limit(1)
      .offset(offset)
      .executeTakeFirst();

    return NextResponse.json({ data: olelo ?? null, date: todayISO });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/olelo-noeau/daily]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
