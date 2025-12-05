import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as { replyText?: string } | null;
  const replyText = payload?.replyText?.trim();
  if (!replyText) {
    return NextResponse.json({ error: "Reply text required" }, { status: 400 });
  }

  try {
    const message = await prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: {
        aiReply: true,
        thread: { include: { hoa: true } },
      },
    });

    if (!message || !message.thread || !message.thread.hoa) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await assertHoaOwnership(message.thread.hoaId, session.user.id);

    const aiReply = await prisma.aIReply.upsert({
      where: { messageId },
      update: { replyText, error: null, sent: false },
      create: { messageId, replyText, sent: false },
    });

    logInfo("draft updated", { messageId, aiReplyId: aiReply.id });
    return NextResponse.json({ ok: true, aiReply });
  } catch (error) {
    const err = error instanceof Error ? error.message : "Draft update failed";
    logError("draft update failed", { messageId, error: err });
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
