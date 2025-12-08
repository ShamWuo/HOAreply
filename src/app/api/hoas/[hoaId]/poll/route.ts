import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertHoaOwnership } from "@/lib/hoa";
import { prisma } from "@/lib/prisma";
import { pollGmailAccountWithLock } from "@/lib/jobs/gmail-poller";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ hoaId: string }> }) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertHoaOwnership(hoaId, session.user.id);
    const account = await prisma.gmailAccount.findUnique({ where: { hoaId } });

    if (!account) {
      return NextResponse.json({ error: "No Gmail account connected" }, { status: 400 });
    }

    const result = await pollGmailAccountWithLock(account.id);
    logInfo("hoa poll triggered", { hoaId, accountId: account.id, skipped: result.skipped });
    const status = result.skipped ? 202 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Poll failed";
    logError("hoa poll failed", { hoaId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
