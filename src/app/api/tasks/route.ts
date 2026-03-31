import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { extractTasksFromEntry, LLMValidationError } from "@/lib/llm/extract-tasks";

const extractTasksSchema = z.object({
  kiloId: z.number().int().positive("Invalid kilo ID"),
  q1: z.string().nullable().optional(),
  q2: z.string().nullable().optional(),
  q3: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const parsed = extractTasksSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { kiloId, q1, q2, q3 } = parsed.data;

    console.log(`[POST /api/tasks] Extracting tasks for user ${user.id.slice(0, 6)} and kilo answers:`, { kiloId, q1, q2, q3 });

    // Verify the kilo entry exists and belongs to the user
    const kiloEntry = await db
      .selectFrom("kilo")
      .select(["id"])
      .where("id", "=", kiloId)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    if (!kiloEntry) {
      return NextResponse.json(
        { error: "Kilo entry not found or not authorized" },
        { status: 404 }
      );
    }

    // Extract tasks from the questions via LLM
    const result = await extractTasksFromEntry(
      q1 ?? null,
      q2 ?? null,
      q3 ?? null
    );

    // Delete any existing tasks for this kilo entry (idempotent re-extraction)
    await db.deleteFrom("tasks").where("kilo_id", "=", kiloId).execute();

    // Insert new tasks
    const insertedTasks = [];
    for (const task of result.tasks) {
      const inserted = await db
        .insertInto("tasks")
        .values({
          kilo_id: kiloId,
          user_id: user.id,
          title: task.title,
          priority: task.priority,
          summary: result.summary,
        })
        .returning(["id", "title", "priority", "summary", "created_at"])
        .executeTakeFirst();

      if (inserted) insertedTasks.push(inserted);
    }

    return NextResponse.json(
      { tasks: insertedTasks, summary: result.summary },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof LLMValidationError) {
      return NextResponse.json(
        { error: error.message, retryable: true, attempts: error.attempts },
        { status: 502 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/tasks]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);
    const { searchParams } = new URL(request.url);
    const kiloId = searchParams.get("kiloId");

    // If kiloId provided, return tasks for that specific entry
    if (kiloId) {
      const id = parseInt(kiloId);
      if (isNaN(id)) {
        return NextResponse.json(
          { error: "Invalid kiloId" },
          { status: 400 }
        );
      }

      const tasks = await db
        .selectFrom("tasks")
        .select(["id", "kilo_id", "title", "priority", "summary", "created_at"])
        .where("kilo_id", "=", id)
        .where("user_id", "=", user.id)
        .orderBy("created_at", "asc")
        .execute();

      return NextResponse.json({ tasks });
    }

    // Otherwise return all tasks for the user, paginated
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
    const offset = (page - 1) * limit;

    const [tasks, countResult] = await Promise.all([
      db
        .selectFrom("tasks")
        .select(["id", "kilo_id", "title", "priority", "summary", "created_at"])
        .where("user_id", "=", user.id)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute(),
      db
        .selectFrom("tasks")
        .select(({ fn }) => fn.count<number>("id").as("total"))
        .where("user_id", "=", user.id)
        .executeTakeFirst(),
    ]);

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ tasks, total, page, totalPages });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/tasks]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
