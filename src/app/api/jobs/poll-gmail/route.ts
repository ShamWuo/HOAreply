import { NextResponse } from "next/server";
import { pollAllGmailAccounts } from "@/lib/jobs/gmail-poller";

export async function POST() {
  const results = await pollAllGmailAccounts();
  return NextResponse.json({ results });
}
