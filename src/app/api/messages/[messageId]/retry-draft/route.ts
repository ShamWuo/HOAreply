import { NextResponse } from "next/server";
import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callN8nWebhook } from "@/lib/n8n";
import { sendGmailReply } from "@/lib/gmail";
import { logError, logInfo } from "@/lib/logger";

export async function POST(_: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;

  const message = await prisma.emailMessage.findUnique({
    where: { id: messageId },
    include: {
      aiReply: true,
      thread: {
        include: {
          gmailAccount: true,
        },
      },
    },
  });

  if (!message || !message.thread || !message.thread.gmailAccount) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.direction !== MessageDirection.INCOMING) {
    return NextResponse.json({ error: "Only incoming messages can be retried" }, { status: 400 });
  }

  const account = message.thread.gmailAccount;

  try {
    const webhookResponse = await callN8nWebhook({
      hoaId: message.thread.hoaId,
      messageId: message.id,
      threadId: message.thread.gmailThreadId,
      gmailMessageId: message.gmailMessageId ?? "",
      from: message.from,
      to: message.to,
      subject: message.thread.subject,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml ?? undefined,
      receivedAt: message.receivedAt.toISOString(),
      meta: {
        gmailAccountEmail: account.email,
      },
    });

    const aiReply = await prisma.aIReply.upsert({
      where: { messageId: message.id },
      update: {
        replyText: webhookResponse.replyText,
        sent: false,
        error: null,
      },
      create: {
        messageId: message.id,
        replyText: webhookResponse.replyText,
        sent: false,
      },
    });

    if (webhookResponse.send) {
      await sendGmailReply({
        account,
        thread: message.thread,
        originalMessage: message,
        aiReply,
      });
    }

    logInfo("retry-draft success", { messageId: message.id, threadId: message.threadId, sent: webhookResponse.send });
    return NextResponse.redirect(`/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logError("retry-draft failed", { messageId, error: errMsg });

    await prisma.aIReply.upsert({
      where: { messageId: message.id },
      update: {
        error: errMsg,
        sent: false,
      },
      create: {
        messageId: message.id,
        replyText: "",
        sent: false,
        error: errMsg,
      },
    });

    return NextResponse.redirect(`/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}&message=${encodeURIComponent(errMsg)}`);
  }
}
