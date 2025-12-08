import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runUserInitiatedPoll } from "@/lib/jobs/gmail-poller";
import { logError } from "@/lib/logger";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runUserInitiatedPoll(session.user.id);
    const status = result.skipped ? 202 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync temporarily unavailable";
    logError("inbox refresh failed", { userId: session.user.id, error: message });
    return NextResponse.json({ skipped: true, reason: "Sync temporarily unavailable" }, { status: 202 });
  }
}
