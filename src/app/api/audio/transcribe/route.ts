import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("file") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio sent" }, { status: 400 });
    }

    console.log("[transcribe] Received audio file:", audio.name, audio.size, "bytes", audio.type);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      console.error("[transcribe] Missing OPENAI_API_KEY environment variable");
      return NextResponse.json(
        { error: "Transcription configuration is missing. Please contact the administrator." },
        { status: 500 }
      );
    }
    const openai = new OpenAI({ apiKey });

    // Re-wrap with explicit mp4 MIME type so OpenAI accepts it
    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(buffer, "audio.wav", { type: "audio/wav" });

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[transcribe] Error processing request:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
