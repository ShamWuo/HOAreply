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
  residentDisplayName: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
};

export async function getInboxItemsForUser(userId: string, opts?: { limit?: number }) {
  const hoas = await prisma.hOA.findMany({
    where: { userId },
    select: { id: true },
  });

  const hoaIds = hoas.map((h) => h.id);
  if (!hoaIds.length) return { items: [] as InboxItem[], total: 0 };

  const soon = addHours(new Date(), 24);
  const where: Prisma.RequestWhereInput = {
    hoaId: { in: hoaIds },
    kind: RequestKind.RESIDENT,
    OR: [
      { status: { in: INBOX_STATUSES } },
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
      take: opts?.limit ?? 50,
      include: { resident: true },
    }),
    prisma.request.count({ where }),
  ]);

  const items: InboxItem[] = requests.map((req) => ({
    id: req.id,
    summary: (req.summary ?? req.subject ?? "Resident request").trim(),
    residentDisplayName: req.resident?.name || req.resident?.email || "Unknown resident",
    category: req.category,
    priority: req.priority,
    status: req.status,
    slaDueAt: req.slaDueAt?.toISOString() ?? null,
  }));

  return { items, total };
}
