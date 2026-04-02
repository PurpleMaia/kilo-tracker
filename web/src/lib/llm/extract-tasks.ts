import { z } from "zod";
import { getLLMClient, getLLMModel } from "./client";
import { TASK_EXTRACTION_SYSTEM_PROMPT, DAILY_SUMMARY_SYSTEM_PROMPT } from "./prompts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_RETRIES = 3;

const taskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
});

const extractionResultSchema = z.object({
  tasks: z.array(taskSchema),
  summary: z.string().min(1),
});

export type ExtractedTask = z.infer<typeof taskSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

/**
 * Try to parse raw LLM output as JSON and validate against the schema.
 * Strips markdown code fences if present.
 */
function tryParseAndValidate(raw: string | null | undefined): {
  success: true;
  data: ExtractionResult;
} | {
  success: false;
  error: string;
} {
  if (!raw?.trim()) {
    return { success: false, error: "Empty response" };
  }

  // Strip markdown code fences if the model wraps its output
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, error: `Invalid JSON: ${cleaned.slice(0, 200)}` };
  }

  const validated = extractionResultSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      success: false,
      error: `Schema validation failed: ${JSON.stringify(validated.error.issues)}`,
    };
  }

  return { success: true, data: validated.data };
}

/**
 * Build the user message from KILO entry fields.
 * Handles cases where some answers are null/empty.
 */
function buildUserMessage(q1: string | null, q2: string | null, q3: string | null): string {
  const parts: string[] = [];

  if (q1?.trim()) parts.push(`Internal weather: ${q1.trim()}`);
  if (q2?.trim()) parts.push(`Outside observation: ${q2.trim()}`);
  if (q3?.trim()) parts.push(`Excited to do: ${q3.trim()}`);

  if (parts.length === 0) {
    return "(empty entry)";
  }

  return parts.join("\n");
}

/**
 * Send transcription text to the LLM and extract tasks + summary.
 * Retries up to MAX_RETRIES times on malformed responses, appending
 * the validation error to the conversation so the LLM can self-correct.
 */
export async function extractTasksFromEntry(
  q1: string | null,
  q2: string | null,
  q3: string | null
): Promise<ExtractionResult> {
  const userMessage = buildUserMessage(q1, q2, q3);

  // Short-circuit for empty entries
  if (userMessage === "(empty entry)") {
    return { tasks: [], summary: "Brief entry with limited detail." };
  }

  const client = getLLMClient();
  const model = getLLMModel();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: TASK_EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    const result = tryParseAndValidate(raw);

    if (result.success) {
      return result.data;
    }

    // Append the bad response + correction prompt for the next attempt
    messages.push({ role: "assistant", content: raw ?? "" });
    messages.push({
      role: "user",
      content: `Your response was invalid JSON or didn't match the schema. Error: ${result.error}. Please try again with valid JSON matching the exact schema.`,
    });
  }

  throw new LLMValidationError(`LLM failed to produce valid output after ${MAX_RETRIES} attempts`, MAX_RETRIES);
}

export class LLMValidationError extends Error {
  public attempts: number;

  constructor(message: string, attempts: number) {
    super(message);
    this.name = "LLMValidationError";
    this.attempts = attempts;
  }
}

const dailySummarySchema = z.object({
  summary: z.string().min(1),
});

/**
 * Generate a richer daily summary from KILO entry answers and extracted tasks.
 */
export async function generateDailySummary(
  q1: string | null,
  q2: string | null,
  q3: string | null,
  tasks: { title: string; priority: string }[]
): Promise<string> {
  const entryText = buildUserMessage(q1, q2, q3);

  if (entryText === "(empty entry)") {
    return "Brief entry with limited detail.";
  }

  const taskList = tasks.length > 0
    ? `\n\nExtracted tasks:\n${tasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n")}`
    : "";

  const client = getLLMClient();
  const model = getLLMModel();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: DAILY_SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: entryText + taskList },
  ];

  console.log(`[generateDailySummary] Using model: ${model}`);
  console.log(`[generateDailySummary] Input length: ${(entryText + taskList).length} chars`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    console.log(`[generateDailySummary] Attempt ${attempt}/${MAX_RETRIES} — calling LLM...`);

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.4,
    });

    console.log(`[generateDailySummary] Attempt ${attempt} LLM responded in ${Date.now() - attemptStart}ms`);

    const raw = completion.choices[0]?.message?.content;
    console.log(`[generateDailySummary] Raw response (${raw?.length ?? 0} chars): ${raw?.slice(0, 200)}`);
    const cleaned = raw?.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    try {
      const parsed = JSON.parse(cleaned ?? "");
      const validated = dailySummarySchema.safeParse(parsed);
      if (validated.success) {
        console.log(`[generateDailySummary] Parsed successfully on attempt ${attempt}`);
        return validated.data.summary;
      }
      console.log(`[generateDailySummary] Schema validation failed on attempt ${attempt}:`, validated.error.issues);
    } catch (e) {
      console.log(`[generateDailySummary] JSON parse failed on attempt ${attempt}:`, e instanceof Error ? e.message : e);
    }

    messages.push({ role: "assistant", content: raw ?? "" });
    messages.push({
      role: "user",
      content: "Your response was not valid JSON with a \"summary\" field. Please try again.",
    });
  }

  console.log(`[generateDailySummary] All ${MAX_RETRIES} attempts failed, returning fallback`);
  return "Brief entry with limited detail.";
}
