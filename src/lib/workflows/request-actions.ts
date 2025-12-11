import { AuditAction, DraftSource, MessageDirection, RequestCategory, RequestKind, RequestStatus } from "@prisma/client";
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
    riskProtected: Boolean(request.hoa?.riskProtectionEnabled),
  });

  const approved = await prisma.replyDraft.update({
    where: { id: draft.id },
    data: { approvedAt: new Date(), approvedByUserId: params.userId },
  });

  const nextStatus = RequestStatus.IN_PROGRESS;
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
  return { requestId: request.id, draft: approved, status: nextStatus, externalWarning: request.kind !== RequestKind.RESIDENT };
}

export async function sendDraftReply(params: { requestId: string; draftId?: string; userId: string; overrideExternal?: boolean }) {
  // Conservative: Always load full request context to ensure all checks are enforced before sending.
  const request = await loadRequest(params.requestId);
  if (!request || !request.hoa || !request.thread) {
    throw new Error("Request not found");
  }
  if (request.hoa.userId !== params.userId) {
    throw new Error("Unauthorized");
  }
  // Conservative: Never allow sending a reply unless all required approval and audit checks pass.
  const draft = params.draftId
    ? request.drafts.find((d) => d.id === params.draftId)
    : request.drafts[0];
  if (!draft) {
    throw new Error("Draft not found");
  }
  const riskProtected = Boolean(request.hoa?.riskProtectionEnabled);
  const riskCategory = riskProtected && (HIGH_RISK_CATEGORIES.has(request.category) || request.hasLegalRisk);
  if (riskCategory && draft.source !== DraftSource.TEMPLATE) {
    const riskyTerms = containsRiskyLanguage(draft.content);
    if (riskyTerms.length) {
      throw new ValidationError("Draft blocked due to risky language", {
        code: "TONE_RISK",
        terms: riskyTerms,
      });
    }
  }
  await validateRequestGuard({
    request,
    action: "send",
    overrideExternal: params.overrideExternal,
    userId: params.userId,
    riskProtected,
  });
  const requiresApproval =
    request.hasLegalRisk ||
    request.category === RequestCategory.BOARD ||
    (riskProtected && HIGH_RISK_CATEGORIES.has(request.category));
  // Conservative: If request is legal/policy-sensitive, require explicit human approval before sending.
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

  const nextStatus = RequestStatus.NEEDS_INFO;
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
  return { requestId: request.id, draftId: draft.id, to, status: nextStatus, externalWarning: request.kind !== RequestKind.RESIDENT };
}

type GuardContext = {
  request: NonNullable<Awaited<ReturnType<typeof loadRequest>>>;
  action: "approve" | "send";
  overrideExternal?: boolean;
  userId: string;
  riskProtected: boolean;
};

export class ValidationError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

const HIGH_RISK_CATEGORIES = new Set<RequestCategory>([
  RequestCategory.BOARD,
  RequestCategory.VIOLATION,
  RequestCategory.BILLING,
]);

function containsRiskyLanguage(body: string) {
  const flags = [
    /\bi think\b/i,
    /\bi promise\b/i,
    /guarantee/i,
    /guaranteed/i,
    /my personal opinion/i,
    /legal action/i,
    /we will (?:pay|cover)/i,
  ];
  const hits = flags.filter((re) => re.test(body));
  return hits.map((hit) => hit.source);
}

async function validateRequestGuard(ctx: GuardContext) {
  const missingInfo = ctx.request.missingInfo ?? [];
  const nonResident = ctx.request.kind !== RequestKind.RESIDENT;
  const invalidStatus = ctx.request.status !== RequestStatus.IN_PROGRESS;
  const riskCategory = HIGH_RISK_CATEGORIES.has(ctx.request.category) || ctx.request.hasLegalRisk;

  let failure:
    | { code: "MISSING_INFO" | "NOT_RESIDENT_REQUEST" | "INVALID_STATUS" | "RISKY_LANGUAGE"; reason: string; details?: Record<string, unknown> }
    | null = null;

  if (ctx.riskProtected && riskCategory && missingInfo.length > 0) {
    failure = { code: "MISSING_INFO", reason: "Missing required information" };
  } else if (nonResident) {
    failure = { code: "NOT_RESIDENT_REQUEST", reason: "Non-resident or external message" };
  } else if (invalidStatus) {
    failure = { code: "INVALID_STATUS", reason: "Request is not in reviewable status" };
  }

  // Conservative: Always log every validation attempt for auditability, even if validation fails.
  await prisma.auditLog.create({
    data: {
      hoaId: ctx.request.hoaId,
      requestId: ctx.request.id,
      userId: ctx.userId,
      action: AuditAction.VALIDATION,
      metadata: {
        action: ctx.action,
        result: failure ? "blocked" : "allowed",
        reason: failure?.code ?? null,
        missingInfo,
        status: ctx.request.status,
        kind: ctx.request.kind,
        overrideExternal: ctx.overrideExternal ?? false,
        riskProtected: ctx.riskProtected,
      },
    },
  });

  if (failure) {
    throw new ValidationError(failure.reason, {
      code: failure.code,
      action: ctx.action,
      missingInfo,
      kind: ctx.request.kind,
      status: ctx.request.status,
      ...failure.details,
    });
  }
}
