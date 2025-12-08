import { AuditAction, MessageDirection, RequestCategory, RequestKind, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendRequestReply } from "@/lib/gmail";
import { logInfo } from "@/lib/logger";
import { mapRequestStatusToThreadStatus } from "@/lib/workflows/request-pipeline";

function extractEmail(address: string | null | undefined) {
  if (!address) return null;
  const match = address.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim().toLowerCase();
  return address.trim().toLowerCase();
}

async function loadRequest(requestId: string) {
  return prisma.request.findUnique({
    where: { id: requestId },
    include: {
      hoa: true,
      drafts: { orderBy: { createdAt: "desc" } },
      resident: true,
      thread: {
        include: {
          gmailAccount: true,
          messages: { orderBy: { receivedAt: "desc" }, take: 10 },
        },
      },
    },
  });
}

export async function approveDraft(params: { requestId: string; draftId?: string; userId: string; overrideExternal?: boolean }) {
  const request = await loadRequest(params.requestId);
  if (!request || !request.hoa) {
    throw new Error("Request not found");
  }
  if (request.hoa.userId !== params.userId) {
    throw new Error("Unauthorized");
  }

  const draft = params.draftId
    ? request.drafts.find((d) => d.id === params.draftId)
    : request.drafts[0];

  if (!draft) {
    throw new Error("Draft not found");
  }

  await validateRequestGuard({
    request,
    action: "approve",
    overrideExternal: params.overrideExternal,
    userId: params.userId,
  });

  const approved = await prisma.replyDraft.update({
    where: { id: draft.id },
    data: { approvedAt: new Date(), approvedByUserId: params.userId },
  });

  const isFinalStatus = request.status === RequestStatus.RESOLVED || request.status === RequestStatus.CLOSED;
  const nextStatus = isFinalStatus ? request.status : RequestStatus.IN_PROGRESS;

  const threadStatus = mapRequestStatusToThreadStatus(nextStatus);

  await prisma.$transaction([
    prisma.request.update({
      where: { id: request.id },
      data: { status: nextStatus, lastActionAt: new Date() },
    }),
    prisma.emailThread.update({
      where: { id: request.threadId },
      data: { status: threadStatus },
    }),
    prisma.auditLog.createMany({
      data: [
        {
          hoaId: request.hoaId,
          requestId: request.id,
          userId: params.userId,
          action: AuditAction.APPROVED,
          metadata: { draftId: draft.id },
        },
        {
          hoaId: request.hoaId,
          requestId: request.id,
          userId: params.userId,
          action: AuditAction.STATUS_CHANGED,
          metadata: { from: request.status, to: nextStatus },
        },
      ],
    }),
  ]);

  logInfo("draft approved", { requestId: request.id, draftId: draft.id, status: nextStatus });
  return { requestId: request.id, draft: approved, status: nextStatus, externalWarning: request.kind !== RequestKind.RESIDENT_REQUEST };
}

export async function sendDraftReply(params: { requestId: string; draftId?: string; userId: string; overrideExternal?: boolean }) {
  const request = await loadRequest(params.requestId);
  if (!request || !request.hoa || !request.thread) {
    throw new Error("Request not found");
  }
  if (request.hoa.userId !== params.userId) {
    throw new Error("Unauthorized");
  }

  const draft = params.draftId
    ? request.drafts.find((d) => d.id === params.draftId)
    : request.drafts[0];

  if (!draft) {
    throw new Error("Draft not found");
  }

  await validateRequestGuard({
    request,
    action: "send",
    overrideExternal: params.overrideExternal,
    userId: params.userId,
  });

  const requiresApproval =
    request.hasLegalRisk ||
    request.category === RequestCategory.LEGAL ||
    request.category === RequestCategory.BOARD;
  if (requiresApproval && !draft.approvedAt) {
    throw new Error("Approval required before sending");
  }

  if (!request.thread.gmailAccount) {
    throw new Error("Missing Gmail account for thread");
  }

  const to = request.resident?.email
    ?? extractEmail(request.thread.messages.find((m) => m.direction === MessageDirection.INCOMING)?.from)
    ?? extractEmail(request.thread.messages[0]?.from);

  if (!to) {
    throw new Error("Unable to determine recipient email");
  }

  const inbound = request.thread.messages.find((m) => m.direction === MessageDirection.INCOMING);
  const meta = (inbound?.metaJson ?? {}) as Record<string, string | undefined>;

  await sendRequestReply({
    account: request.thread.gmailAccount,
    thread: request.thread,
    to,
    body: draft.content,
    inReplyTo: meta.messageId,
    references: meta.references,
  });

  const now = new Date();

  await prisma.emailMessage.create({
    data: {
      threadId: request.threadId,
      gmailMessageId: null,
      direction: MessageDirection.OUTGOING,
      from: request.thread.gmailAccount.email,
      to,
      bodyText: draft.content,
      bodyHtml: null,
      receivedAt: now,
    },
  });

  const nextStatus = RequestStatus.AWAITING_REPLY;
  const threadStatus = mapRequestStatusToThreadStatus(nextStatus);

  await prisma.$transaction([
    prisma.replyDraft.update({
      where: { id: draft.id },
      data: { sentAt: now, sentByUserId: params.userId },
    }),
    prisma.request.update({
      where: { id: request.id },
      data: { status: nextStatus, lastActionAt: now },
    }),
    prisma.emailThread.update({
      where: { id: request.threadId },
      data: { status: threadStatus },
    }),
    prisma.auditLog.createMany({
      data: [
        {
          hoaId: request.hoaId,
          requestId: request.id,
          userId: params.userId,
          action: AuditAction.SENT,
          metadata: { draftId: draft.id, to },
        },
        {
          hoaId: request.hoaId,
          requestId: request.id,
          userId: params.userId,
          action: AuditAction.STATUS_CHANGED,
          metadata: { from: request.status, to: nextStatus },
        },
      ],
    }),
  ]);

  logInfo("draft sent", { requestId: request.id, draftId: draft.id, to, status: nextStatus });
  return { requestId: request.id, draftId: draft.id, to, status: nextStatus, externalWarning: request.kind !== RequestKind.RESIDENT_REQUEST };
}

type GuardContext = {
  request: NonNullable<Awaited<ReturnType<typeof loadRequest>>>;
  action: "approve" | "send";
  overrideExternal?: boolean;
  userId: string;
};

export class ValidationError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

async function validateRequestGuard(ctx: GuardContext) {
  const missingInfo = ctx.request.missingInfo ?? [];
  const nonResident = ctx.request.kind !== RequestKind.RESIDENT_REQUEST;
  const closed = ctx.request.status === RequestStatus.CLOSED || ctx.request.status === RequestStatus.RESOLVED;

  let passed = true;
  let reason: string | null = null;

  if (missingInfo.length > 0) {
    passed = false;
    reason = "Missing required information";
  } else if (closed) {
    passed = false;
    reason = "Request is closed";
  } else if (nonResident && !ctx.overrideExternal) {
    passed = false;
    reason = "Non-resident or external message";
  }

  await prisma.auditLog.create({
    data: {
      hoaId: ctx.request.hoaId,
      requestId: ctx.request.id,
      userId: ctx.userId,
      action: AuditAction.VALIDATION,
      metadata: {
        action: ctx.action,
        passed,
        reason,
        missingInfo,
        status: ctx.request.status,
        kind: ctx.request.kind,
        overrideExternal: ctx.overrideExternal ?? false,
      },
    },
  });

  if (!passed) {
    throw new ValidationError(reason ?? "Validation failed", {
      action: ctx.action,
      missingInfo,
      kind: ctx.request.kind,
      requiresOverride: nonResident && !ctx.overrideExternal,
      status: ctx.request.status,
    });
  }
}
