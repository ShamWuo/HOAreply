import { NextResponse } from "next/server";
import { MessageDirection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callN8nWebhook } from "@/lib/n8n";
import { sendGmailReply } from "@/lib/gmail";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") ?? undefined;
  const tone = url.searchParams.get("tone") ?? undefined;
  const length = url.searchParams.get("length") ?? undefined;

  const message = await prisma.emailMessage.findUnique({
    where: { id: messageId },
    include: {
      aiReply: true,
      thread: {
        include: {
          gmailAccount: true,
          hoa: {
            include: { user: true },
          },
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
      managerName: message.thread.hoa.user?.name ?? message.thread.hoa.user?.email ?? "Manager",
      hoaName: message.thread.hoa.name,
      variant,
      tone,
      length,
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

    if (webhookResponse.classification || webhookResponse.priority) {
      const category = webhookResponse.classification ?? null;
      const priority = webhookResponse.priority ?? null;
      await prisma.$transaction([
        prisma.emailThread.update({
          where: { id: message.threadId },
          data: { category, priority } as Prisma.EmailThreadUpdateInput,
        }),
        prisma.threadClassificationHistory.create({
          data: {
            threadId: message.threadId,
            category,
            priority,
          },
        }),
      ]);
    }

    if (webhookResponse.send) {
      await sendGmailReply({
        account,
        thread: message.thread,
        originalMessage: message,
        aiReply,
      });
    }

    logInfo("retry-draft success", { messageId: message.id, threadId: message.threadId, sent: webhookResponse.send });
    const successUrl = new URL(
      `/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}`,
      process.env.APP_BASE_URL ?? "http://localhost:3000",
    );
    return NextResponse.redirect(successUrl);
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

    const failureUrl = new URL(
      `/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}&message=${encodeURIComponent(errMsg)}`,
      process.env.APP_BASE_URL ?? "http://localhost:3000",
    );
    return NextResponse.redirect(failureUrl);
  }
}
