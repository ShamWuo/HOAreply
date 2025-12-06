import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (client) return client;
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}
