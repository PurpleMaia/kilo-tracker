import { NextRequest, NextResponse } from "next/server";
import { getHawaiianMoonPhase } from "@/lib/moon";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    let date: Date;

    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }

      date = new Date(dateParam + "T00:00:00Z");

      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date." },
          { status: 400 }
        );
      }
    } else {
      date = new Date();
    }

    const data = getHawaiianMoonPhase(date);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/moon]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
