import { NextResponse } from "next/server";
import { AuditAction, RequestCategory, RequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const policy = await prisma.policyTemplate.findUnique({
    where: { id },
    include: { hoa: { select: { id: true, name: true, userId: true } } },
  });

  if (!policy || policy.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ policy });
}

export async function PUT(req: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.policyTemplate.findUnique({
    where: { id },
    include: { hoa: { select: { userId: true } } },
  });
  if (!existing || existing.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await req.json().catch(() => ({}));
  const { category, title, bodyTemplate, isDefault, requestStatus, missingFields, isActive } = data as Record<string, unknown>;

  const parsedMissing =
    Array.isArray(missingFields) ? missingFields.map((v) => String(v).trim()).filter(Boolean) : typeof missingFields === "string" ? missingFields.split(",").map((v) => v.trim()).filter(Boolean) : [];

  const nextCategory = (category as RequestCategory) || existing.category;
  const nextStatus = (requestStatus as RequestStatus) || existing.requestStatus;
  if (!Object.values(RequestStatus).includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid request status" }, { status: 400 });
  }
  const nextIsActive = isActive === undefined ? existing.isActive : Boolean(isActive);
  const nextIsDefault = nextIsActive ? (isDefault === undefined ? existing.isDefault : Boolean(isDefault)) : false;

  const updated = await prisma.$transaction(async (tx) => {
    if (nextIsDefault) {
      await tx.policyTemplate.updateMany({
        where: { hoaId: existing.hoaId, category: nextCategory, requestStatus: nextStatus },
        data: { isDefault: false },
      });
    }

    return tx.policyTemplate.update({
      where: { id },
      data: {
        category: nextCategory,
        title: title ? String(title) : existing.title,
        bodyTemplate: bodyTemplate ? String(bodyTemplate) : existing.bodyTemplate,
        isDefault: nextIsDefault,
        isActive: nextIsActive,
        requestStatus: nextStatus,
        missingFields: missingFields !== undefined ? parsedMissing : existing.missingFields,
      },
    });
  });

  await prisma.auditLog.createMany({
    data: [
      {
        hoaId: existing.hoaId,
        userId: session.user.id,
        action: AuditAction.TEMPLATE_UPDATED,
        metadata: { templateId: updated.id, category: updated.category, requestStatus: updated.requestStatus },
      },
      isActiveChanged(existing.isActive, nextIsActive)
        ? {
            hoaId: existing.hoaId,
            userId: session.user.id,
            action: nextIsActive ? AuditAction.TEMPLATE_ACTIVATED : AuditAction.TEMPLATE_DEACTIVATED,
            metadata: { templateId: updated.id },
          }
        : null,
      nextIsDefault
        ? {
            hoaId: existing.hoaId,
            userId: session.user.id,
            action: AuditAction.TEMPLATE_SET_AS_DEFAULT,
            metadata: { templateId: updated.id, category: updated.category, requestStatus: updated.requestStatus },
          }
        : null,
    ].filter(Boolean) as Parameters<typeof prisma.auditLog.createMany>[0]["data"],
  });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const redirectUrl = new URL("/app/templates", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({ policy: updated });
}

export async function DELETE(_: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.policyTemplate.findUnique({
    where: { id },
    include: { hoa: { select: { userId: true } } },
  });
  if (!existing || existing.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.policyTemplate.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  });

  await prisma.auditLog.create({
    data: {
      hoaId: existing.hoaId,
      userId: session.user.id,
      action: AuditAction.TEMPLATE_DEACTIVATED,
      metadata: { templateId: updated.id },
    },
  });

  return NextResponse.json({ ok: true, policy: updated });
}

export async function POST(req: Request, ctx: Context) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const override = form?.get("_method")?.toString().toUpperCase();
    if (override === "DELETE") {
      return DELETE(req, ctx);
    }
    if (override === "PUT") {
      const body = Object.fromEntries(form ?? []);
      const json = JSON.stringify(body);
      const clone = new Request(req, { method: "PUT", body: json, headers: req.headers });
      return PUT(clone, ctx);
    }
  }
  return PUT(req, ctx);
}

function isActiveChanged(prev: boolean, next: boolean) {
  return prev !== next;
}
