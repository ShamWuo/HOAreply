import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        latencyMs: Date.now() - startedAt,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "error",
        db: "error",
        latencyMs: Date.now() - startedAt,
        error: message,
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
