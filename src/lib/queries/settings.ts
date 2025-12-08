import { RequestCategory, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INBOX_STATUSES } from "@/lib/queries/inbox";

export type SettingsTemplateDefault = {
  templateId: string | null;
  title: string;
  category: RequestCategory;
  requestStatus: RequestStatus;
  updatedAt: string | null;
};

export type SettingsHoa = {
  id: string;
  name: string;
  createdAt: string;
  gmail?: {
    email: string;
    lastPolledAt: string | null;
    lastPollError: string | null;
  } | null;
  stats: {
    threads: number;
    requests: number;
    openRequests: number;
  };
  defaults: Partial<Record<RequestCategory, Partial<Record<RequestStatus, SettingsTemplateDefault>>>>;
};

export type SettingsOverview = {
  hoas: SettingsHoa[];
};

export async function getSettingsOverview(userId: string): Promise<SettingsOverview> {
  const hoas = await prisma.hOA.findMany({
    where: { userId },
    include: {
      gmailAccount: {
        select: {
          email: true,
          lastPolledAt: true,
          lastPollError: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const hoaIds = hoas.map((hoa) => hoa.id);
  if (!hoaIds.length) {
    return { hoas: [] };
  }

  const [threadCounts, requestCounts, defaultTemplates] = await Promise.all([
    prisma.emailThread.groupBy({
      by: ["hoaId"],
      _count: { _all: true },
      where: { hoaId: { in: hoaIds } },
    }),
    prisma.request.groupBy({
      by: ["hoaId", "status"],
      _count: { _all: true },
      where: { hoaId: { in: hoaIds } },
    }),
    prisma.policyTemplate.findMany({
      where: { hoaId: { in: hoaIds }, isDefault: true },
      select: {
        id: true,
        hoaId: true,
        category: true,
        requestStatus: true,
        title: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const threadCountMap = new Map<string, number>();
  threadCounts.forEach((row) => threadCountMap.set(row.hoaId, row._count._all));

  const requestTotalMap = new Map<string, number>();
  const openRequestMap = new Map<string, number>();
  const openStatuses = new Set<RequestStatus>(INBOX_STATUSES);
  requestCounts.forEach((row) => {
    requestTotalMap.set(row.hoaId, (requestTotalMap.get(row.hoaId) ?? 0) + row._count._all);
    if (openStatuses.has(row.status as RequestStatus)) {
      openRequestMap.set(row.hoaId, (openRequestMap.get(row.hoaId) ?? 0) + row._count._all);
    }
  });

  // Conservative: Enforce only one default template per (category, status). If multiple, pick the most recently updated (by order).
  const defaultsByHoa = new Map<string, Partial<Record<RequestCategory, Partial<Record<RequestStatus, SettingsTemplateDefault>>>>>();
  defaultTemplates.forEach((tpl) => {
    const current = defaultsByHoa.get(tpl.hoaId) ?? {};
    const categoryDefaults = current[tpl.category] ?? {};
    // Always overwrite with the most recently updated default (due to orderBy: updatedAt desc)
    categoryDefaults[tpl.requestStatus] = {
      templateId: tpl.id,
      title: tpl.title,
      category: tpl.category,
      requestStatus: tpl.requestStatus,
      updatedAt: tpl.updatedAt?.toISOString() ?? null,
    };
    current[tpl.category] = categoryDefaults;
    defaultsByHoa.set(tpl.hoaId, current);
  });

  const settingsHoas: SettingsHoa[] = hoas.map((hoa) => ({
    id: hoa.id,
    name: hoa.name,
    createdAt: hoa.createdAt.toISOString(),
    gmail: hoa.gmailAccount
      ? {
          email: hoa.gmailAccount.email,
          lastPolledAt: hoa.gmailAccount.lastPolledAt?.toISOString() ?? null,
          lastPollError: hoa.gmailAccount.lastPollError ?? null,
        }
      : null,
    stats: {
      threads: threadCountMap.get(hoa.id) ?? 0,
      requests: requestTotalMap.get(hoa.id) ?? 0,
      openRequests: openRequestMap.get(hoa.id) ?? 0,
    },
    defaults: defaultsByHoa.get(hoa.id) ?? {},
  }));

  return { hoas: settingsHoas };
}
