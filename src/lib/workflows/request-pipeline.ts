import {
  AuditAction,
  DraftAuthor,
  DraftSource,
  RequestCategory,
  RequestKind,
  RequestPriority,
  RequestStatus,
  ThreadKind,
  ThreadStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import { getSystemTemplate } from "@/lib/templates/default-templates";

export type ClassificationResult = {
  category: RequestCategory;
  priority: RequestPriority;
  missingInfo: string[];
  hasLegalRisk: boolean;
  kind: RequestKind;
};

type RoutingDecision = {
  status: RequestStatus;
  slaDueAt: Date | null;
};

type TemplateContext = {
  hoaName: string;
  managerName: string;
  residentName: string;
  category: RequestCategory;
  priority: RequestPriority;
  missingInfo: string[];
  subject: string;
};

function normalizeText(subject?: string, body?: string | null) {
  return `${subject ?? ""} ${body ?? ""}`.toLowerCase();
}

// Placeholder classifier; replace with OpenAI/Gemini client as needed.
export function classifyEmail(
  subject?: string,
  bodyText?: string | null,
  bodyHtml?: string | null,
  opts?: { hasResident: boolean; fromEmail?: string | null; marketing?: boolean },
): ClassificationResult {
  const text = normalizeText(subject, bodyText ?? bodyHtml ?? undefined);
  const hasResident = Boolean(opts?.hasResident);
  const fromEmail = (opts?.fromEmail ?? "").toLowerCase();
  const domain = fromEmail.split("@")[1] ?? "";
  const looksSalesy = opts?.marketing || text.includes("unsubscribe") || text.includes("promotion") || text.includes("offer");
  const looksVendor =
    text.includes("proposal") ||
    text.includes("quote") ||
    text.includes("vendor") ||
    domain.includes("contractor") ||
    domain.includes("services") ||
    domain.includes("repairs");
  const looksLegal = /liability|legal|counsel|attorney|lawsuit|claim|demand/i.test(text);
  const looksArc = /architectural|arc request|arc approval|paint scheme|roof color|fence|landscap|exterior/i.test(text);

  const category: RequestCategory = (() => {
    if (looksSalesy) return RequestCategory.OTHER;
    if (looksLegal) return RequestCategory.OTHER;
    if (looksArc) return RequestCategory.BOARD;
    if (text.includes("board")) return RequestCategory.BOARD;
    if (text.includes("violation") || text.includes("notice") || text.includes("warning")) return RequestCategory.VIOLATION;
    if (text.includes("maintenance") || text.includes("repair") || text.includes("leak")) return RequestCategory.MAINTENANCE;
    if (text.includes("invoice") || text.includes("payment") || text.includes("bill")) return RequestCategory.BILLING;
    return RequestCategory.GENERAL;
  })();

  const priority: RequestPriority = (() => {
    if (text.includes("fire") || text.includes("flood") || text.includes("emergency")) return RequestPriority.URGENT;
    if (text.includes("urgent") || text.includes("asap")) return RequestPriority.HIGH;
    if (text.includes("low priority")) return RequestPriority.LOW;
    return RequestPriority.NORMAL;
  })();

  const missingInfo: string[] = [];
  if (hasResident) {
    const hasUnit = /unit\s*\d|#\d|apt\s*\d/i.test(text);
    if (!hasUnit && category !== RequestCategory.GENERAL) missingInfo.push("unit_number");
    if (category === RequestCategory.BILLING) {
      if (!/account|statement|invoice|bill\s*#|payment/i.test(text)) missingInfo.push("account_identifier");
    }
    if (category === RequestCategory.MAINTENANCE) {
      if (!/at\s+|near\s+|intersection|street|road|pool|clubhouse|building/i.test(text)) missingInfo.push("location");
      if (!/photo|attached|image|screenshot/i.test(text)) missingInfo.push("photo");
      if (!/high|urgent|emergency|low|medium/i.test(text)) missingInfo.push("severity");
    }
    if (category === RequestCategory.VIOLATION) {
      if (!/section|rule|bylaw|covenant/i.test(text)) missingInfo.push("rule_cited");
      if (!/am|pm|\d{1,2}:\d{2}/i.test(text)) missingInfo.push("date_time");
      if (!/address|lot|unit/i.test(text)) missingInfo.push("location_or_unit");
    }
    if (category === RequestCategory.BOARD && looksArc) {
      if (!/lot/i.test(text)) missingInfo.push("lot_number");
      if (!/material|color|paint|roof|fence|landscap/i.test(text)) missingInfo.push("description");
      if (!/start/i.test(text)) missingInfo.push("estimated_start_date");
      if (!/attach|form/i.test(text)) missingInfo.push("arc_form");
    }
    if (category === RequestCategory.BOARD && !looksArc) {
      if (!/lot/i.test(text)) missingInfo.push("lot_number");
      if (!/board request|arc|architectural|plan|paint|roof|fence|landscap/i.test(text)) missingInfo.push("description");
      if (!/attach|form/i.test(text)) missingInfo.push("arc_form");
    }
  }

  const hasLegalRisk = looksLegal;

  const kind: RequestKind = (() => {
    if (!hasResident && looksSalesy) return RequestKind.NEWSLETTER;
    if (!hasResident && looksVendor) return RequestKind.VENDOR;
    if (!hasResident) return RequestKind.UNKNOWN;
    if (category === RequestCategory.OTHER) return looksSalesy ? RequestKind.NEWSLETTER : RequestKind.UNKNOWN;
    return RequestKind.RESIDENT;
  })();

  return { category, priority, missingInfo, hasLegalRisk, kind };
}

function computeSla(priority: RequestPriority): Date | null {
  const hours = priority === RequestPriority.URGENT ? 24 : priority === RequestPriority.HIGH ? 48 : priority === RequestPriority.NORMAL ? 72 : 120;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function applyRouting(classification: ClassificationResult): RoutingDecision {
  if (classification.kind !== RequestKind.RESIDENT) {
    return { status: RequestStatus.CLOSED, slaDueAt: null };
  }
  if (classification.missingInfo.length > 0) {
    return { status: RequestStatus.NEEDS_INFO, slaDueAt: null };
  }
  return { status: RequestStatus.OPEN, slaDueAt: computeSla(classification.priority) };
}

export function mapRequestStatusToThreadStatus(status: RequestStatus): ThreadStatus {
  switch (status) {
    case RequestStatus.NEEDS_INFO:
      return ThreadStatus.AWAITING_RESIDENT;
    case RequestStatus.IN_PROGRESS:
      return ThreadStatus.PENDING;
    case RequestStatus.RESOLVED:
    case RequestStatus.CLOSED:
      return ThreadStatus.RESOLVED;
    case RequestStatus.OPEN:
    default:
      return ThreadStatus.NEW;
  }
}

function renderTemplate(body: string, ctx: TemplateContext): string {
  const replacements: Record<string, string> = {
    hoa_name: ctx.hoaName,
    manager_name: ctx.managerName,
    resident_name: ctx.residentName,
    category: ctx.category,
    priority: ctx.priority,
    missing_info: ctx.missingInfo.join(", ") || "the requested details",
    subject: ctx.subject,
    sla_hint: ctx.priority === RequestPriority.URGENT || ctx.priority === RequestPriority.HIGH ? "24-48 hours" : "72 hours",
  };

  return body.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (match, key) => {
    const replacement = replacements[key as keyof typeof replacements];
    return replacement ?? match;
  });
}

async function pickTemplate(hoaId: string, category: RequestCategory, status: RequestStatus) {
  // Conservative: Only allow selection of templates that are active and approved.
  // If multiple defaults exist for a situation, always pick the most recently updated.
  const template = await prisma.policyTemplate.findFirst({
    where: { hoaId, category, requestStatus: status, isActive: true },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (template) return template;

  const fallback = await prisma.policyTemplate.findFirst({
    where: { hoaId, category, isActive: true },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (fallback) return fallback;

  const systemDefault = getSystemTemplate(category, status);
  return {
    id: null,
    bodyTemplate: systemDefault.body,
    title: systemDefault.title,
  } as const;
}

async function pickRequestInfoTemplate(hoaId: string, category: RequestCategory) {
  const template = await prisma.policyTemplate.findFirst({
    where: { hoaId, isActive: true, requestStatus: RequestStatus.NEEDS_INFO, category },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (template) return template;

  const systemDefault = getSystemTemplate(category, RequestStatus.NEEDS_INFO);
  return {
    id: null,
    bodyTemplate: systemDefault.body,
    title: systemDefault.title,
  } as const;
}

export async function runRequestPipeline(requestId: string) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      thread: { include: { messages: { orderBy: { receivedAt: "desc" }, take: 10 }, gmailAccount: true } },
      resident: true,
      hoa: true,
    },
  });

  if (!request || !request.thread) {
    throw new Error("Request not found");
  }

  const latestMessage = request.thread.messages[0];
  const classification = classifyEmail(
    request.subject,
    latestMessage?.bodyText ?? latestMessage?.bodyHtml ?? undefined,
    latestMessage?.bodyHtml,
    { hasResident: Boolean(request.residentId), fromEmail: latestMessage?.from },
  );
  const routing = applyRouting(classification);

  const summary = buildSummary({
    subject: request.subject,
    residentName: request.resident?.name,
    residentEmail: request.resident?.email,
    category: classification.category,
    priority: classification.priority,
    missingInfo: classification.missingInfo,
    hasLegalRisk: classification.hasLegalRisk,
    hoaName: request.hoa.name,
  });

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: {
      kind: classification.kind,
      category: classification.category,
      priority: classification.priority,
      missingInfo: classification.missingInfo,
      hasLegalRisk: classification.hasLegalRisk,
      classification,
      status: routing.status,
      slaDueAt: routing.slaDueAt ?? undefined,
      lastActionAt: new Date(),
      summary,
      summaryUpdatedAt: new Date(),
    },
  });

  const threadStatus = mapRequestStatusToThreadStatus(routing.status);
  await prisma.emailThread.update({
    where: { id: request.threadId },
    data: {
      status: threadStatus,
      category: classification.category,
      priority: classification.priority,
      kind: mapRequestKindToThreadKind(classification.kind),
    },
  });

  const template = classification.missingInfo.length > 0
    ? await pickRequestInfoTemplate(request.hoaId, classification.category)
    : await pickTemplate(request.hoaId, classification.category, routing.status);

  const draftContent = renderTemplate(template.bodyTemplate, {
    hoaName: request.hoa.name,
    managerName: request.hoa.userId ?? "Manager",
    residentName: request.resident?.name ?? request.resident?.email ?? "Resident",
    category: classification.category,
    priority: classification.priority,
    missingInfo: classification.missingInfo,
    subject: request.subject,
  });

  const draft = await prisma.replyDraft.create({
    data: {
      requestId: request.id,
      templateId: template.id ?? undefined,
      messageId: latestMessage?.id,
      content: draftContent,
      createdBy: DraftAuthor.ai,
      source: DraftSource.TEMPLATE,
    },
  });

  const auditEntries: Prisma.AuditLogCreateManyInput[] = [
    {
      hoaId: request.hoaId,
      requestId: request.id,
      action: AuditAction.CLASSIFIED,
      metadata: classification,
    },
    {
      hoaId: request.hoaId,
      requestId: request.id,
      action: AuditAction.STATUS_CHANGED,
      metadata: { status: routing.status, slaDueAt: routing.slaDueAt },
    },
    {
      hoaId: request.hoaId,
      requestId: request.id,
      action: AuditAction.DRAFT_GENERATED,
      metadata: { draftId: draft.id, templateId: template.id, source: draft.source, templateTitle: template.title },
    },
  ];

  if (template.id) {
    auditEntries.push({
      hoaId: request.hoaId,
      requestId: request.id,
      action: AuditAction.TEMPLATE_APPLIED,
      metadata: { draftId: draft.id, templateId: template.id },
    });
  }

  await prisma.auditLog.createMany({ data: auditEntries });

  logInfo("request-pipeline run", {
    requestId: request.id,
    status: routing.status,
    category: classification.category,
    priority: classification.priority,
  });

  return { request: updated, draft, classification, routing };
}

export async function handleInboundRequest(params: {
  hoaId: string;
  hoaName: string;
  managerName: string;
  threadId: string;
  residentId?: string | null;
  residentName?: string | null;
  residentEmail?: string | null;
  fromEmail?: string | null;
  marketing?: boolean;
  subject: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
}) {
  const classification = classifyEmail(params.subject, params.bodyText, params.bodyHtml, {
    hasResident: Boolean(params.residentId),
    fromEmail: params.fromEmail ?? params.residentEmail,
    marketing: params.marketing,
  });
  const routing = applyRouting(classification);

  if (classification.kind !== RequestKind.RESIDENT) {
    await prisma.threadClassificationHistory.create({
      data: {
        threadId: params.threadId,
        category: classification.category,
        priority: classification.priority,
      },
    }).catch(() => {});

    await prisma.emailThread.update({
      where: { id: params.threadId },
      data: {
        status: ThreadStatus.RESOLVED,
        category: classification.category,
        priority: classification.priority,
      },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        hoaId: params.hoaId,
        action: AuditAction.CLASSIFIED,
        metadata: { kind: classification.kind, category: classification.category },
      },
    }).catch(() => {});

    logInfo("request-pipeline skipped non-resident", {
      threadId: params.threadId,
      hoaId: params.hoaId,
      kind: classification.kind,
    });

    return { request: null, draft: null, classification, routing } as const;
  }

  const summary = buildSummary({
    subject: params.subject,
    residentName: params.residentName,
    residentEmail: params.residentEmail,
    category: classification.category,
    priority: classification.priority,
    missingInfo: classification.missingInfo,
    hasLegalRisk: classification.hasLegalRisk,
    hoaName: params.hoaName,
  });

  const request = await prisma.request.upsert({
    where: { threadId: params.threadId },
    update: {
      subject: params.subject,
      updatedAt: new Date(),
      lastActionAt: new Date(),
      residentId: params.residentId,
      category: classification.category,
      priority: classification.priority,
      status: routing.status,
      slaDueAt: routing.slaDueAt ?? undefined,
      classification,
      missingInfo: classification.missingInfo,
      hasLegalRisk: classification.hasLegalRisk,
      kind: classification.kind,
      summary,
      summaryUpdatedAt: new Date(),
    },
    create: {
      hoaId: params.hoaId,
      threadId: params.threadId,
      subject: params.subject,
      residentId: params.residentId,
      category: classification.category,
      priority: classification.priority,
      status: routing.status,
      slaDueAt: routing.slaDueAt ?? undefined,
      classification,
      missingInfo: classification.missingInfo,
      hasLegalRisk: classification.hasLegalRisk,
      kind: classification.kind,
      summary,
      summaryUpdatedAt: new Date(),
    },
  });

  const threadStatus = mapRequestStatusToThreadStatus(routing.status);
  await prisma.emailThread.update({
    where: { id: params.threadId },
    data: {
      status: threadStatus,
      category: classification.category,
      priority: classification.priority,
    },
  });

  const template = classification.missingInfo.length > 0
    ? await pickRequestInfoTemplate(params.hoaId, classification.category)
    : await pickTemplate(params.hoaId, classification.category, routing.status);

  const draftContent = renderTemplate(template.bodyTemplate, {
    hoaName: params.hoaName,
    managerName: params.managerName,
    residentName: params.residentName ?? "Resident",
    category: classification.category,
    priority: classification.priority,
    missingInfo: classification.missingInfo,
    subject: params.subject,
  });

  const draft = await prisma.replyDraft.create({
    data: {
      requestId: request.id,
      templateId: template.id ?? undefined,
      content: draftContent,
      createdBy: DraftAuthor.ai,
      source: template.id ? DraftSource.TEMPLATE : DraftSource.MANUAL,
    },
  });

  const creationAuditEntries: Prisma.AuditLogCreateManyInput[] = [
    {
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.EMAIL_RECEIVED,
      metadata: { threadId: params.threadId },
    },
    {
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.REQUEST_CREATED,
      metadata: { category: classification.category, priority: classification.priority },
    },
    {
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.CLASSIFIED,
      metadata: classification,
    },
    {
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.DRAFT_GENERATED,
      metadata: { draftId: draft.id, templateId: template.id, source: draft.source },
    },
    {
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.STATUS_CHANGED,
      metadata: { status: routing.status, slaDueAt: routing.slaDueAt },
    },
  ];

  if (template.id) {
    creationAuditEntries.push({
      hoaId: params.hoaId,
      requestId: request.id,
      action: AuditAction.TEMPLATE_APPLIED,
      metadata: { draftId: draft.id, templateId: template.id },
    });
  }

  await prisma.auditLog.createMany({ data: creationAuditEntries });

  logInfo("request-pipeline processed", {
    requestId: request.id,
    threadId: params.threadId,
    status: routing.status,
    category: classification.category,
    priority: classification.priority,
  });

  return { request, draft, classification, routing };
}

function mapRequestKindToThreadKind(kind: RequestKind): ThreadKind {
  if (kind === RequestKind.RESIDENT) return ThreadKind.resident;
  if (kind === RequestKind.VENDOR) return ThreadKind.vendor;
  if (kind === RequestKind.NEWSLETTER) return ThreadKind.newsletter_spam;
  return ThreadKind.unknown;
}

function buildSummary(params: {
  subject: string;
  residentName?: string | null;
  residentEmail?: string | null;
  category: RequestCategory;
  priority: RequestPriority;
  missingInfo: string[];
  hasLegalRisk: boolean;
  hoaName: string;
}) {
  const issue = (params.subject || "Resident request").trim();
  const who = params.residentName ?? params.residentEmail ?? "Resident";
  const needs = params.missingInfo.map((item) => (item.toLowerCase().includes("unit") ? "unit number" : item.replaceAll("_", " ")));

  const firstSentence = `${who} asked about ${issue}.`;
  const secondSentence = needs.length
    ? `Waiting for ${needs.join(" and ")} to proceed.`
    : "Ready for review.";

  return `${firstSentence} ${secondSentence}`.trim();
}
