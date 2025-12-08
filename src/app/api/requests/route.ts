import { NextRequest, NextResponse } from "next/server";
import { Prisma, RequestCategory, RequestKind, RequestPriority, RequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const categoryParam = searchParams.get("category");
  const kindParam = searchParams.get("kind");
  const hoaIdParam = searchParams.get("hoaId");
  const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();
  const hasLegalRisk = searchParams.get("legal") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

  const hoas = await prisma.hOA.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const hoaIds = hoas.map((h) => h.id);
  if (!hoaIds.length) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const statusFilter = statusParam?.split(",").filter(Boolean) as RequestStatus[] | undefined;
  const priorityFilter = priorityParam?.split(",").filter(Boolean) as RequestPriority[] | undefined;
  const categoryFilter = categoryParam?.split(",").filter(Boolean) as RequestCategory[] | undefined;
  const kindFilter = kindParam?.split(",").filter(Boolean) as RequestKind[] | undefined;

  const scopedHoaIds = hoaIdParam ? hoaIds.filter((id) => id === hoaIdParam) : hoaIds;
  if (!scopedHoaIds.length) {
    return NextResponse.json({ error: "Unauthorized HOA" }, { status: 403 });
  }

  const where: Prisma.RequestWhereInput = {
    hoaId: { in: scopedHoaIds },
    status: statusFilter && statusFilter.length ? { in: statusFilter } : undefined,
    priority: priorityFilter && priorityFilter.length ? { in: priorityFilter } : undefined,
    category: categoryFilter && categoryFilter.length ? { in: categoryFilter } : undefined,
    hasLegalRisk: hasLegalRisk ? true : undefined,
    kind: kindFilter && kindFilter.length ? { in: kindFilter } : { equals: RequestKind.RESIDENT },
    OR: q
      ? [
          { subject: { contains: q, mode: "insensitive" } },
          { resident: { email: { contains: q, mode: "insensitive" } } },
          { resident: { name: { contains: q, mode: "insensitive" } } },
        ]
      : undefined,
  };

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      include: {
        resident: true,
        hoa: { select: { id: true, name: true } },
        thread: { select: { id: true, subject: true, status: true, unreadCount: true, priority: true, category: true } },
      },
    }),
    prisma.request.count({ where }),
  ]);

  const items = requests.map((req) => ({
    id: req.id,
    summary: req.summary ?? req.subject,
    residentName: req.resident?.name ?? null,
    residentEmail: req.resident?.email ?? "",
    subject: req.subject,
    category: req.category,
    priority: req.priority,
    status: req.status,
    kind: req.kind,
    slaDueAt: req.slaDueAt?.toISOString() ?? null,
    updatedAt: req.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, total });
}
