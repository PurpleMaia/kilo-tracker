import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    // Client timezone offset in minutes from Date.getTimezoneOffset()
    // getTimezoneOffset() returns positive for west of UTC (e.g. 600 for HST/UTC-10)
    const tzOffset = parseInt(searchParams.get("tz") ?? "0");

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 }
      );
    }

    const offsetMs = isNaN(tzOffset) ? 0 : tzOffset * 60 * 1000;

    // Convert local month boundaries to UTC
    // Midnight local = midnight UTC + offsetMs (e.g. midnight HST = 10:00 UTC)
    const startDate = new Date(Date.UTC(year, month - 1, 1) + offsetMs);
    const endDate = new Date(Date.UTC(year, month, 1) + offsetMs);

    const results = await db
      .selectFrom("kilo")
      .select("created_at")
      .where("user_id", "=", user.id)
      .where("created_at", ">=", startDate)
      .where("created_at", "<", endDate)
      .orderBy("created_at", "asc")
      .execute();

    // Extract unique date strings (YYYY-MM-DD) in the client's local timezone
    const dateSet = new Set<string>();
    for (const row of results) {
      if (row.created_at) {
        const d = new Date(row.created_at as unknown as string);
        // Shift UTC timestamp to client local time (subtract offset since offset is positive for west)
        const local = new Date(d.getTime() - offsetMs);
        const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
        dateSet.add(key);
      }
    }

    return NextResponse.json({ dates: Array.from(dateSet) });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/kilo/dates]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
