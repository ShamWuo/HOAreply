import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { Prisma, RequestKind, RequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRIAGE_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.NEEDS_INFO,
  RequestStatus.AWAITING_REPLY,
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoas = await prisma.hOA.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const hoaIds = hoas.map((h) => h.id);
  if (!hoaIds.length) return NextResponse.json({ items: [], total: 0 });

  const soon = addHours(new Date(), 24);

  const where: Prisma.RequestWhereInput = {
    hoaId: { in: hoaIds },
    kind: RequestKind.RESIDENT_REQUEST,
    OR: [
      { status: { in: TRIAGE_STATUSES } },
      { slaDueAt: { lte: soon } },
    ],
  };

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { slaDueAt: "asc" },
        { updatedAt: "desc" },
      ],
      take: 50,
      include: {
        resident: true,
      },
    }),
    prisma.request.count({ where }),
  ]);

  const items = requests.map((req) => ({
    id: req.id,
    summary: req.subject,
    residentName: req.resident?.name ?? null,
    residentEmail: req.resident?.email ?? "",
    category: req.category,
    priority: req.priority,
    status: req.status,
    slaDueAt: req.slaDueAt?.toISOString() ?? null,
    updatedAt: req.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, total });
}
