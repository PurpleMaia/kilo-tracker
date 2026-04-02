import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { generateDailySummary } from "@/lib/llm/extract-tasks";

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);

    // Get the most recent kilo entry for this user
    const latestKilo = await db
      .selectFrom("kilo")
      .select(["id", "q1", "q2", "q3", "created_at"])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .limit(1)
      .executeTakeFirst();

    if (!latestKilo) {
      return NextResponse.json({ summary: null, tasks: [], kiloId: null });
    }

    // Only generate summary for today's kilo entry
    const kiloDate = new Date(latestKilo.created_at as string);
    const now = new Date();
    const isToday =
      kiloDate.getFullYear() === now.getFullYear() &&
      kiloDate.getMonth() === now.getMonth() &&
      kiloDate.getDate() === now.getDate();

    if (!isToday) {
      return NextResponse.json({ summary: null, tasks: [], kiloId: null });
    }

    // Get tasks for this kilo entry
    const tasks = await db
      .selectFrom("tasks")
      .select(["id", "title", "priority"])
      .where("kilo_id", "=", latestKilo.id)
      .where("user_id", "=", user.id)
      .orderBy("created_at", "asc")
      .execute();

    // Always generate a rich summary via the dedicated prompt
    const start = Date.now();
    console.log("[GET /api/tasks/summary] Starting LLM summary generation...");
    const summary = await generateDailySummary(
      latestKilo.q1,
      latestKilo.q2,
      latestKilo.q3,
      tasks.map((t) => ({ title: t.title, priority: t.priority }))
    );
    console.log(`[GET /api/tasks/summary] LLM summary generation completed in ${Date.now() - start}ms`);

    return NextResponse.json({
      summary,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
      kiloId: latestKilo.id,
      createdAt: latestKilo.created_at,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/tasks/summary]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
