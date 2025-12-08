import { NextResponse } from "next/server";
import { AuditAction, DraftAuthor, RequestStatus } from "@prisma/client";
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
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    content = typeof body.content === "string" ? body.content.trim() : "";
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("content");
    if (typeof value === "string") content = value.trim();
  }

  if (!content) {
    return NextResponse.json({ error: "Draft content required" }, { status: 400 });
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
          },
        })
      : await tx.replyDraft.create({
          data: {
            requestId: requestRecord.id,
            content,
            createdBy: DraftAuthor.user,
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

    await tx.auditLog.create({
      data: {
        hoaId: requestRecord.hoaId,
        requestId: requestRecord.id,
        userId: session.user.id,
        action: existing ? AuditAction.DRAFT_REGENERATED : AuditAction.DRAFT_GENERATED,
        metadata: { draftId: saved.id },
      },
    });

    return saved;
  });

  return NextResponse.json({ draft, status: nextStatus });
}
