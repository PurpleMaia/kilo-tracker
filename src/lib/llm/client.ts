import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (_client) return _client;

  const baseUrl = process.env.MODEL_BASE_URL?.trim();
  const apiKey = process.env.MODEL_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error("Missing MODEL_BASE_URL or MODEL_API_KEY environment variables");
  }

  _client = new OpenAI({
    baseURL: `${baseUrl}/v1`,
    apiKey,
  });

  return _client;
}

export function getLLMModel(): string {
  const model = process.env.LLM_MODEL?.trim();
  if (!model) {
    throw new Error("Missing LLM_MODEL environment variable");
  }
  return model;
}
