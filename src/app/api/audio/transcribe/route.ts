import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("file") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio sent" }, { status: 400 });
    }

    console.log("[transcribe] Received audio file:", audio.name, audio.size, "bytes", audio.type);
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
    console.error("[transcribe] Error processing request:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
