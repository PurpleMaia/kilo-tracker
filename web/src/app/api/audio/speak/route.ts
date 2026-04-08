import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { checkLLMRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
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

    const question = {
      "input": "What is your weather like today?",
      "model": process.env.SPEACHES_TTS_MODEL || "speaches-ai/Kokoro-82M-v1.0-ONNX",
      "voice": "af_heart"
    };

    const response = await openai.audio.speech.create({
      model: question.model,
      voice: question.voice,
      input: question.input,
      response_format: "mp3",
      speed: 1.0,
    });

    // `response` is a streaming response containing raw MP3 bytes.
    // Forward it directly to the client with the appropriate content type.
    return new NextResponse(response.body, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });

  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/audio/speak]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
