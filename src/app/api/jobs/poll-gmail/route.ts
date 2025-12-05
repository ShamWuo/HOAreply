import { NextRequest, NextResponse } from "next/server";
import { runGmailPollJob } from "@/lib/jobs/gmail-poller";
import { env } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: NextRequest) {
  if (env.CRON_SECRET) {
    const headerSecret = request.headers.get("x-cron-secret");
    if (headerSecret !== env.CRON_SECRET) {
      logError("poll-gmail unauthorized attempt", { path: request.nextUrl.pathname });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { skipped, summaries, reason } = await runGmailPollJob();

  if (skipped) {
    logInfo("poll-gmail skipped", { reason });
    return NextResponse.json({ skipped: true, reason }, { status: 202 });
  }

  logInfo("poll-gmail completed", { accountsProcessed: summaries.length });
  return NextResponse.json({ results: summaries, skipped: false });
}
