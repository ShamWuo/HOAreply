import { NextResponse } from "next/server";
import { AuditAction, DraftAuthor, DraftSource, RequestStatus, type Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapRequestStatusToThreadStatus } from "@/lib/workflows/request-pipeline";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  let content = "";
  let applyTemplateId: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    content = typeof body.content === "string" ? body.content.trim() : "";
    applyTemplateId = typeof body.applyTemplateId === "string" ? body.applyTemplateId.trim() : null;
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("content");
    if (typeof value === "string") content = value.trim();
    const tplValue = form?.get("applyTemplateId");
    if (typeof tplValue === "string") applyTemplateId = tplValue.trim();
  }

  const requestRecord = await prisma.request.findUnique({
    where: { id: requestId },
    include: { hoa: true, drafts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!requestRecord || requestRecord.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = requestRecord.drafts[0];
  const isFinalStatus = requestRecord.status === RequestStatus.CLOSED;
  const nextStatus = isFinalStatus ? requestRecord.status : RequestStatus.IN_PROGRESS;
  const threadStatus = mapRequestStatusToThreadStatus(nextStatus);
  const now = new Date();

  let templateId: string | undefined = existing?.templateId ?? undefined;
  let source: DraftSource = existing?.source ?? DraftSource.MANUAL;

  if (applyTemplateId) {
    const template = await prisma.policyTemplate.findUnique({
      where: { id: applyTemplateId },
    });

    if (!template || template.hoaId !== requestRecord.hoaId || !template.isActive) {
      return NextResponse.json({ error: "Template not available" }, { status: 400 });
    }

    if (template.category !== requestRecord.category || (template.requestStatus && template.requestStatus !== requestRecord.status)) {
      return NextResponse.json({ error: "Template does not match request state" }, { status: 400 });
    }

    content = template.bodyTemplate;
    templateId = template.id;
    source = DraftSource.TEMPLATE;
  }

  if (!content) {
    return NextResponse.json({ error: "Draft content required" }, { status: 400 });
  }

  const draft = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.replyDraft.update({
          where: { id: existing.id },
          data: {
            content,
            createdBy: DraftAuthor.user,
            approvedAt: null,
            approvedByUserId: null,
            sentAt: null,
            sentByUserId: null,
            templateId,
            source: determineSource(existing.content, content, existing.source, source),
          },
        })
      : await tx.replyDraft.create({
          data: {
            requestId: requestRecord.id,
            content,
            createdBy: DraftAuthor.user,
            templateId,
            source,
          },
        });

    await tx.request.update({
      where: { id: requestRecord.id },
      data: { status: nextStatus, lastActionAt: now },
    });

    await tx.emailThread.update({
      where: { id: requestRecord.threadId },
      data: { status: threadStatus },
    });

    const auditEntries: Prisma.AuditLogCreateManyInput[] = [
      {
        hoaId: requestRecord.hoaId,
        requestId: requestRecord.id,
        userId: session.user.id,
        action: existing ? AuditAction.DRAFT_REGENERATED : AuditAction.DRAFT_GENERATED,
        metadata: { draftId: saved.id, source: saved.source, templateId: saved.templateId },
      },
    ];

    if (applyTemplateId && templateId) {
      auditEntries.push({
        hoaId: requestRecord.hoaId,
        requestId: requestRecord.id,
        userId: session.user.id,
        action: AuditAction.TEMPLATE_APPLIED,
        metadata: { draftId: saved.id, templateId },
      });
    }

    await tx.auditLog.createMany({ data: auditEntries });

    return saved;
  });

  return NextResponse.json({ draft, status: nextStatus });
}

function determineSource(previousContent: string, nextContent: string, previousSource: DraftSource, currentSource: DraftSource): DraftSource {
  if (currentSource === DraftSource.TEMPLATE) return DraftSource.TEMPLATE;
  if (previousSource === DraftSource.TEMPLATE && previousContent !== nextContent) return DraftSource.MODIFIED_FROM_TEMPLATE;
  if (previousSource === DraftSource.MODIFIED_FROM_TEMPLATE && previousContent !== nextContent) return DraftSource.MODIFIED_FROM_TEMPLATE;
  return currentSource ?? DraftSource.MANUAL;
}
