import { DraftSource, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CategoryRow = { category: string; count: number };

function formatHoursToText(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">Sign in to view analytics.</GlassPanel>
    );
  }

  const hoas = await prisma.hOA.findMany({ where: { userId: session.user.id }, select: { id: true } });
  const hoaIds = hoas.map((h) => h.id);

  if (!hoaIds.length) {
    return (
      <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">Connect an HOA workspace to see metrics.</GlassPanel>
    );
  }

  const now = Date.now();
  const sinceDays = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

  const [openCount, total7, total30, overdueCount, humanEdited, totalDrafts, categoryRows, resolved] = await Promise.all([
    prisma.request.count({ where: { hoaId: { in: hoaIds }, status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_INFO] } } }),
    prisma.request.count({ where: { hoaId: { in: hoaIds }, createdAt: { gte: sinceDays(7) } } }),
    prisma.request.count({ where: { hoaId: { in: hoaIds }, createdAt: { gte: sinceDays(30) } } }),
    prisma.request.count({ where: { hoaId: { in: hoaIds }, slaDueAt: { not: null, lt: new Date() }, status: { in: [RequestStatus.OPEN, RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_INFO] } } }),
    prisma.replyDraft.count({
      where: {
        createdAt: { gte: sinceDays(30) },
        request: { hoaId: { in: hoaIds } },
        source: { in: [DraftSource.MANUAL, DraftSource.MODIFIED_FROM_TEMPLATE] },
      },
    }),
    prisma.replyDraft.count({ where: { createdAt: { gte: sinceDays(30) }, request: { hoaId: { in: hoaIds } } } }),
    prisma.request.groupBy({
      by: ["category"],
      _count: { _all: true },
      where: { hoaId: { in: hoaIds }, createdAt: { gte: sinceDays(30) } },
    }),
    prisma.request.findMany({
      where: { hoaId: { in: hoaIds }, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
      orderBy: { closedAt: "desc" },
      take: 500,
    }),
  ]);

  const avgResolutionHours = (() => {
    if (!resolved.length) return null;
    const totalMs = resolved.reduce((sum, row) => sum + ((row.closedAt?.getTime() ?? 0) - row.createdAt.getTime()), 0);
    return totalMs / resolved.length / (1000 * 60 * 60);
  })();

  const humanEditPct = totalDrafts > 0 ? Math.round((humanEdited / totalDrafts) * 100) : null;
  const categories: CategoryRow[] = categoryRows.map((row) => ({ category: row.category, count: row._count._all }));

  const cards = [
    { label: "Open requests", value: openCount },
    { label: "New requests (7d)", value: total7 },
    { label: "New requests (30d)", value: total30 },
    { label: "Overdue / at risk", value: overdueCount },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Analytics</p>
        <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-[var(--color-muted)]">Honest metrics only—no placeholders.</p>
      </header>

      <GlassPanel className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((metric) => (
            <div key={metric.label} className="rounded-md border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-ink)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{metric.value}</p>
            </div>
          ))}
          {avgResolutionHours !== null ? (
            <div className="rounded-md border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-ink)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Avg time received → resolved</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{formatHoursToText(avgResolutionHours)}</p>
              <p className="text-sm text-[var(--color-muted)]">Based on last {resolved.length} resolved items (max 500).</p>
            </div>
          ) : null}
          {humanEditPct !== null ? (
            <div className="rounded-md border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-ink)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Replies needing human edits</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{humanEditPct}%</p>
              <p className="text-sm text-[var(--color-muted)]">Manual or modified drafts in last 30 days.</p>
            </div>
          ) : null}
        </div>
      </GlassPanel>

      {categories.length ? (
        <GlassPanel className="p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Requests by category (30d)</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((row) => (
              <div key={row.category} className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{row.category}</p>
                <p className="text-base font-semibold">{row.count}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {!categories.length && avgResolutionHours === null && humanEditPct === null ? (
        <GlassPanel className="p-6 text-sm text-[var(--color-muted)]">No analytics data yet. Once emails arrive and drafts are reviewed, metrics will appear automatically.</GlassPanel>
      ) : null}
    </div>
  );
}
