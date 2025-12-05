import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGmailReply } from "@/lib/gmail";
import { assertHoaOwnership } from "@/lib/hoa";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const message = await prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: {
        aiReply: true,
        thread: {
          include: {
            gmailAccount: true,
            hoa: true,
          },
        },
      },
    });

    if (!message || !message.thread || !message.thread.hoa) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await assertHoaOwnership(message.thread.hoaId, session.user.id);

    if (!message.aiReply || !message.aiReply.replyText.trim()) {
      return NextResponse.json({ error: "No draft to send" }, { status: 400 });
    }

    if (!message.thread.gmailAccount) {
      return NextResponse.json({ error: "Gmail account not connected" }, { status: 400 });
    }

    await sendGmailReply({
      account: message.thread.gmailAccount,
      thread: message.thread,
      originalMessage: message,
      aiReply: message.aiReply,
    });

    await prisma.aIReply.update({
      where: { id: message.aiReply.id },
      data: { sent: true, error: null },
    });

    logInfo("manual send success", { messageId, threadId: message.threadId });
    const redirectUrl = new URL(`/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}`, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const err = error instanceof Error ? error.message : "Send failed";
    logError("manual send failed", { messageId, error: err });
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
