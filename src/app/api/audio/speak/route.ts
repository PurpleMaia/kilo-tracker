import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const baseUrl = process.env.SPEACHES_BASE_URL?.trim();
    const apiKey = process.env.SPEACHES_API_KEY?.trim();
    if (!baseUrl || !apiKey) {
      console.error("[speaches] Missing SPEACHES_BASE_URL or SPEACHES_API_KEY environment variables");
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
    console.error("[speaches] Error processing request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
