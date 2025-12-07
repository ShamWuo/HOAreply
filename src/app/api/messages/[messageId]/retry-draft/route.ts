import { NextResponse } from "next/server";
import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import { handleInboundRequest, runRequestPipeline } from "@/lib/workflows/request-pipeline";

export async function POST(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const url = new URL(request.url);
  // legacy query params retained to avoid breaking links; unused in new pipeline
  const _variant = url.searchParams.get("variant") ?? undefined;
  const _tone = url.searchParams.get("tone") ?? undefined;
  const _length = url.searchParams.get("length") ?? undefined;
  void _variant;
  void _tone;
  void _length;

  const message = await prisma.emailMessage.findUnique({
    where: { id: messageId },
    include: {
      resident: true,
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

  try {
    const existingRequest = await prisma.request.findUnique({ where: { threadId: message.threadId } });

    const result = existingRequest
      ? await runRequestPipeline(existingRequest.id)
      : await handleInboundRequest({
          hoaId: message.thread.hoaId,
          hoaName: message.thread.hoa.name,
          managerName: message.thread.hoa.user?.name ?? message.thread.hoa.user?.email ?? "Manager",
          threadId: message.thread.id,
          residentId: message.residentId,
          residentName: message.resident?.name ?? message.resident?.email ?? "Resident",
          subject: message.thread.subject,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml,
        });

    logInfo("retry-draft success", { messageId: message.id, threadId: message.threadId, status: result.routing.status });
    const successUrl = new URL(
      `/app/hoa/${message.thread.hoaId}/inbox?thread=${message.threadId}`,
      process.env.APP_BASE_URL ?? "http://localhost:3000",
    );
    return NextResponse.redirect(successUrl, 303);
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
    return NextResponse.redirect(failureUrl, 303);
  }
}
