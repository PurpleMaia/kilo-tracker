import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { checkLLMRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Validate user session
    const user = await validateSession(request);

    // Rate limit LLM API calls
    const rateLimitResponse = checkLLMRateLimit(request, user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const baseUrl = process.env.MODEL_BASE_URL?.trim();
    const apiKey = process.env.MODEL_API_KEY?.trim();
    if (!baseUrl || !apiKey) {
      console.error("[speaches] Missing MODEL_BASE_URL or MODEL_API_KEY environment variables");
      return NextResponse.json(
        { error: "Speaches configuration is missing. Please contact the administrator." },
        { status: 500 }
      );
    }
    const openai = new OpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey,
    });

    // Make a simple test call to verify connectivity and credentials
    await openai.models.list();

    return NextResponse.json({ status: "ok" }, { status: 200 });

  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[GET /api/audio/health]", error);
    return NextResponse.json({ error: "Failed to connect to Speaches API" }, { status: 500 });
  }
}