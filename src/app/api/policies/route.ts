import { NextResponse } from "next/server";
import { RequestCategory, RequestPriority } from "@prisma/client";
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
  const { hoaId, category, priority, title, bodyTemplate, isDefault } = data;

  if (!hoaId || !category || !title || !bodyTemplate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const hoa = await prisma.hOA.findFirst({ where: { id: String(hoaId), userId: session.user.id } });
  if (!hoa) {
    return NextResponse.json({ error: "HOA not found" }, { status: 404 });
  }

  const policy = await prisma.policyTemplate.create({
    data: {
      hoaId: hoa.id,
      category: category as RequestCategory,
      priority: priority ? (priority as RequestPriority) : null,
      title: String(title),
      bodyTemplate: String(bodyTemplate),
      isDefault: Boolean(isDefault),
    },
  });

  if (!contentType.includes("application/json")) {
    const redirectUrl = new URL("/app/templates", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({ policy });
}
