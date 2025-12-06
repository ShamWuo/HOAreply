import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const startedAt = Date.now();
  try {
    const client = getOpenAIClient();
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 2,
      temperature: 0,
    });

    return NextResponse.json(
      {
        status: "ok",
        latencyMs: Date.now() - startedAt,
        model: result.model,
        id: result.id,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI smoke failed";
    return NextResponse.json(
      {
        status: "error",
        latencyMs: Date.now() - startedAt,
        error: message,
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
