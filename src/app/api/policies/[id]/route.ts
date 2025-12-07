import { NextResponse } from "next/server";
import { RequestCategory, RequestPriority } from "@prisma/client";
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
  const { category, priority, title, bodyTemplate, isDefault } = data as Record<string, unknown>;

  const updated = await prisma.policyTemplate.update({
    where: { id },
    data: {
      category: category ? (category as RequestCategory) : existing.category,
      priority: priority ? (priority as RequestPriority) : null,
      title: title ? String(title) : existing.title,
      bodyTemplate: bodyTemplate ? String(bodyTemplate) : existing.bodyTemplate,
      isDefault: isDefault === undefined ? existing.isDefault : Boolean(isDefault),
    },
  });

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

  await prisma.policyTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
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
