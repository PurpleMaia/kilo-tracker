import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB limit for audio files

export async function POST(request: NextRequest) {
  try {
    // Validate user session
    await validateSession(request);

    const formData = await request.formData();
    const audio = formData.get("file") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio sent" }, { status: 400 });
    }

    // Validate audio file size
    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.SPEACHES_BASE_URL?.trim();
    const apiKey = process.env.SPEACHES_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      console.error("[transcribe] Missing SPEACHES_BASE_URL or SPEACHES_API_KEY environment variables");
      return NextResponse.json(
        { error: "Transcription configuration is missing. Please contact the administrator." },
        { status: 500 }
      );
    }

   const openai = new OpenAI({ baseURL: `${baseUrl}/v1`, apiKey });

    const response = await openai.audio.transcriptions.create({
      file: audio,
      model: process.env.SPEACHES_STT_MODEL || "Systran/faster-whisper-large-v3"      
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/audio/transcribe]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
