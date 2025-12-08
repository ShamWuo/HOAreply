import { NextResponse } from "next/server";
import { AuditAction, RequestCategory, RequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoas = await prisma.hOA.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });
  const hoaIds = hoas.map((h) => h.id);
  if (!hoaIds.length) return NextResponse.json({ policies: [] });

  const policies = await prisma.policyTemplate.findMany({
    where: { hoaId: { in: hoaIds } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ policies, hoas });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let data: Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    data = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData().catch(() => null);
    if (form) data = Object.fromEntries(form.entries());
  }
  const { hoaId, category, title, bodyTemplate, isDefault, requestStatus, missingFields, isActive } = data;

  if (!hoaId || !category || !title || !bodyTemplate || !requestStatus) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const nextStatus = requestStatus as RequestStatus;
  if (!Object.values(RequestStatus).includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid request status" }, { status: 400 });
  }

  const hoa = await prisma.hOA.findFirst({ where: { id: String(hoaId), userId: session.user.id } });
  if (!hoa) {
    return NextResponse.json({ error: "HOA not found" }, { status: 404 });
  }

  const parsedMissing =
    Array.isArray(missingFields) ? missingFields.map((v) => String(v).trim()).filter(Boolean) : typeof missingFields === "string" ? missingFields.split(",").map((v) => v.trim()).filter(Boolean) : [];

  const nextIsActive = isActive === undefined ? true : Boolean(isActive);
  const wantsDefault = Boolean(isDefault) && nextIsActive;

  const policy = await prisma.$transaction(async (tx) => {
    if (wantsDefault) {
      await tx.policyTemplate.updateMany({
        where: { hoaId: hoa.id, category: category as RequestCategory, requestStatus: nextStatus },
        data: { isDefault: false },
      });
    }

    const created = await tx.policyTemplate.create({
      data: {
        hoaId: hoa.id,
        category: category as RequestCategory,
        requestStatus: nextStatus,
        title: String(title),
        bodyTemplate: String(bodyTemplate),
        isDefault: wantsDefault,
        isActive: nextIsActive,
        missingFields: parsedMissing,
      },
    });

    await tx.auditLog.createMany({
      data: [
        {
          hoaId: hoa.id,
          userId: session.user.id,
          action: AuditAction.TEMPLATE_CREATED,
          metadata: { templateId: created.id, category, requestStatus: nextStatus, isActive: nextIsActive },
        },
        wantsDefault
          ? {
              hoaId: hoa.id,
              userId: session.user.id,
              action: AuditAction.TEMPLATE_SET_AS_DEFAULT,
              metadata: { templateId: created.id, category, requestStatus: nextStatus },
            }
          : null,
        nextIsActive
          ? {
              hoaId: hoa.id,
              userId: session.user.id,
              action: AuditAction.TEMPLATE_ACTIVATED,
              metadata: { templateId: created.id },
            }
          : {
              hoaId: hoa.id,
              userId: session.user.id,
              action: AuditAction.TEMPLATE_DEACTIVATED,
              metadata: { templateId: created.id },
            },
      ].filter(Boolean) as Parameters<typeof tx.auditLog.createMany>[0]["data"],
    });

    return created;
  });

  if (!contentType.includes("application/json")) {
    const redirectUrl = new URL("/app/templates", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({ policy });
}
