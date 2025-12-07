import { AuditAction, DraftAuthor, RequestCategory, RequestPriority, RequestStatus, ThreadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";

export type ClassificationResult = {
  category: RequestCategory;
  priority: RequestPriority;
  missingInfo: string[];
  hasLegalRisk: boolean;
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

const DEFAULT_REQUEST_INFO_TEMPLATE =
  "Hi {{resident_name}},\n\nThanks for your message to {{hoa_name}}. To move this forward, please provide: {{missing_info}}.\n\nOnce we have this, we will continue the review.\n\nThanks,\n{{manager_name}}";

const DEFAULT_CATEGORY_TEMPLATES: Record<RequestCategory, string> = {
  [RequestCategory.MAINTENANCE]:
    "Hi {{resident_name}},\n\nWe received your maintenance request. We're reviewing and will update you by {{sla_hint}}.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.VIOLATION]:
    "Hi {{resident_name}},\n\nWe received your note. Your request is under review and will be responded to after review.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.BILLING]:
    "Hi {{resident_name}},\n\nWe received your billing question and will review the account details.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.GENERAL]:
    "Hi {{resident_name}},\n\nThanks for your message. We will review and respond soon.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.BOARD]:
    "Hi {{resident_name}},\n\nWe received your board-related request and will route it to the appropriate board member.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.LEGAL]:
    "Hi {{resident_name}},\n\nWe received your note. We will review and follow up.\n\nThanks,\n{{manager_name}}",
  [RequestCategory.SPAM]:
    "",
};

function normalizeText(subject?: string, body?: string | null) {
  return `${subject ?? ""} ${body ?? ""}`.toLowerCase();
}

// Placeholder classifier; replace with OpenAI/Gemini client as needed.
export function classifyEmail(subject?: string, bodyText?: string | null, bodyHtml?: string | null): ClassificationResult {
  const text = normalizeText(subject, bodyText ?? bodyHtml ?? undefined);

  const category: RequestCategory = (() => {
    if (text.includes("legal") || text.includes("attorney") || text.includes("lawsuit")) return RequestCategory.LEGAL;
    if (text.includes("board")) return RequestCategory.BOARD;
    if (text.includes("violation") || text.includes("notice") || text.includes("warning")) return RequestCategory.VIOLATION;
    if (text.includes("maintenance") || text.includes("repair") || text.includes("leak")) return RequestCategory.MAINTENANCE;
    if (text.includes("invoice") || text.includes("payment") || text.includes("bill")) return RequestCategory.BILLING;
    if (text.includes("unsubscribe") || text.includes("marketing")) return RequestCategory.SPAM;
    return RequestCategory.GENERAL;
  })();

  const priority: RequestPriority = (() => {
    if (text.includes("fire") || text.includes("flood") || text.includes("emergency")) return RequestPriority.URGENT;
    if (text.includes("urgent") || text.includes("asap")) return RequestPriority.HIGH;
    if (text.includes("low priority")) return RequestPriority.LOW;
    return RequestPriority.NORMAL;
  })();

  const missingInfo: string[] = [];
  const hasUnit = /unit\s*\d|#\d|apt\s*\d/i.test(text);
  if (!hasUnit) missingInfo.push("unit_number");
  if (category === RequestCategory.BILLING && !/amount|invoice|payment/i.test(text)) missingInfo.push("billing_details");

  const hasLegalRisk = category === RequestCategory.LEGAL || /liability|legal|counsel|attorney/i.test(text);

  return { category, priority, missingInfo, hasLegalRisk };
}

function computeSla(priority: RequestPriority): Date | null {
  const hours = priority === RequestPriority.URGENT ? 24 : priority === RequestPriority.HIGH ? 48 : priority === RequestPriority.NORMAL ? 72 : 120;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function applyRouting(classification: ClassificationResult): RoutingDecision {
  if (classification.missingInfo.length > 0) {
    return { status: RequestStatus.NEEDS_INFO, slaDueAt: null };
  }
  if (classification.category === RequestCategory.SPAM) {
    return { status: RequestStatus.CLOSED, slaDueAt: null };
  }
  return { status: RequestStatus.AWAITING_REPLY, slaDueAt: computeSla(classification.priority) };
}

export function mapRequestStatusToThreadStatus(status: RequestStatus): ThreadStatus {
  switch (status) {
    case RequestStatus.NEEDS_INFO:
      return ThreadStatus.AWAITING_RESIDENT;
    case RequestStatus.AWAITING_REPLY:
    case RequestStatus.IN_PROGRESS:
      return ThreadStatus.PENDING;
    case RequestStatus.RESOLVED:
    case RequestStatus.CLOSED:
      return ThreadStatus.RESOLVED;
    case RequestStatus.NEW:
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

async function pickTemplate(hoaId: string, category: RequestCategory, priority: RequestPriority) {
  const template = await prisma.policyTemplate.findFirst({
    where: { hoaId, category, priority },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  if (template) return template;

  const fallback = await prisma.policyTemplate.findFirst({
    where: { hoaId, category },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  if (fallback) return fallback;

  return {
    id: null,
    bodyTemplate: DEFAULT_CATEGORY_TEMPLATES[category] ?? DEFAULT_CATEGORY_TEMPLATES[RequestCategory.GENERAL],
    title: "Default",
  } as const;
}

async function pickRequestInfoTemplate(hoaId: string) {
  const template = await prisma.policyTemplate.findFirst({
    where: { hoaId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  if (template) return template;

  return {
    id: null,
    bodyTemplate: DEFAULT_REQUEST_INFO_TEMPLATE,
    title: "Request info",
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
  const classification = classifyEmail(request.subject, latestMessage?.bodyText ?? latestMessage?.bodyHtml ?? undefined, latestMessage?.bodyHtml);
  const routing = applyRouting(classification);

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: {
      category: classification.category,
      priority: classification.priority,
      missingInfo: classification.missingInfo,
      hasLegalRisk: classification.hasLegalRisk,
      classification,
      status: routing.status,
      slaDueAt: routing.slaDueAt ?? undefined,
      lastActionAt: new Date(),
    },
  });

  const threadStatus = mapRequestStatusToThreadStatus(routing.status);
  await prisma.emailThread.update({
    where: { id: request.threadId },
    data: {
      status: threadStatus,
      category: classification.category,
      priority: classification.priority,
    },
  });

  const template = classification.missingInfo.length > 0
    ? await pickRequestInfoTemplate(request.hoaId)
    : await pickTemplate(request.hoaId, classification.category, classification.priority);

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
    },
  });

  await prisma.auditLog.createMany({
    data: [
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
        metadata: { draftId: draft.id, templateId: template.id },
      },
    ],
  });

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
  subject: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
}) {
  const classification = classifyEmail(params.subject, params.bodyText, params.bodyHtml);
  const routing = applyRouting(classification);

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
    ? await pickRequestInfoTemplate(params.hoaId)
    : await pickTemplate(params.hoaId, classification.category, classification.priority);

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
    },
  });

  await prisma.auditLog.createMany({
    data: [
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
        metadata: { draftId: draft.id, templateId: template.id },
      },
      {
        hoaId: params.hoaId,
        requestId: request.id,
        action: AuditAction.STATUS_CHANGED,
        metadata: { status: routing.status, slaDueAt: routing.slaDueAt },
      },
    ],
  });

  logInfo("request-pipeline processed", {
    requestId: request.id,
    threadId: params.threadId,
    status: routing.status,
    category: classification.category,
    priority: classification.priority,
  });

  return { request, draft, classification, routing };
}
