import { addHours } from "date-fns";
import { Prisma, RequestCategory, RequestKind, RequestPriority, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INBOX_STATUSES: RequestStatus[] = [
  RequestStatus.OPEN,
  RequestStatus.IN_PROGRESS,
  RequestStatus.NEEDS_INFO,
];

export type InboxItem = {
  id: string;
  summary: string;
  subject: string;
  residentDisplayName: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
  reason: string;
};

export async function getInboxItemsForUser(userId: string, opts?: { limit?: number }) {
  const hoas = await prisma.hOA.findMany({
    where: { userId },
    select: { id: true },
  });

  const hoaIds = hoas.map((h) => h.id);
  if (!hoaIds.length) return { items: [] as InboxItem[], total: 0 };

  const soon = addHours(new Date(), 24);
  const riskCategories = [RequestCategory.BOARD, RequestCategory.VIOLATION, RequestCategory.BILLING];

  const where: Prisma.RequestWhereInput = {
    hoaId: { in: hoaIds },
    kind: RequestKind.RESIDENT,
    AND: [
      {
        OR: [
          { status: RequestStatus.NEEDS_INFO },
          {
            AND: [
              { status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS] } },
              { slaDueAt: { not: null, lte: soon } },
            ],
          },
        ],
      },
      {
        OR: [{ category: { in: riskCategories } }, { hasLegalRisk: true }],
      },
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
      take: opts?.limit ?? 50,
      include: { resident: true },
    }),
    prisma.request.count({ where }),
  ]);

  const items: InboxItem[] = requests.map((req) => ({
    id: req.id,
    summary: (req.summary ?? req.subject ?? "Resident request").trim(),
    subject: req.subject ?? "Resident request",
    residentDisplayName: req.resident?.name || req.resident?.email || "Unknown resident",
    category: req.category,
    priority: req.priority,
    status: req.status,
    slaDueAt: req.slaDueAt?.toISOString() ?? null,
    reason:
      req.status === RequestStatus.NEEDS_INFO
        ? "Waiting on info"
        : req.slaDueAt
          ? req.slaDueAt.getTime() < Date.now()
            ? "SLA overdue"
            : "SLA at risk"
          : "Action required",
  }));

  return { items, total };
}
