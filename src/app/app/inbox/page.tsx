import Link from "next/link";
import { addHours } from "date-fns";
import { RequestKind, RequestPriority, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function pill(priority: RequestPriority) {
  if (priority === RequestPriority.URGENT) return "border-rose-200 text-rose-800 bg-rose-50";
  if (priority === RequestPriority.HIGH) return "border-amber-200 text-amber-800 bg-amber-50";
  return "border-slate-200 text-slate-700 bg-white";
}

function statusTone(status: RequestStatus) {
  if (status === RequestStatus.NEW) return "text-emerald-800 bg-emerald-50 border-emerald-200";
  if (status === RequestStatus.AWAITING_REPLY || status === RequestStatus.NEEDS_INFO)
    return "text-amber-800 bg-amber-50 border-amber-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function formatSla(slaDueAt: string | null) {
  if (!slaDueAt) return "—";
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((due - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const toText = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };
  if (diffMinutes < 0) return `Overdue by ${toText(Math.max(1, absMinutes))}`;
  if (diffMinutes <= 60) return `Due in ${toText(Math.max(1, diffMinutes))}`;
  return `Due in ${toText(diffMinutes)}`;
}

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">
        Please sign in to view inbox.
      </GlassPanel>
    );
  }

  const hoas = await prisma.hOA.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const hoaIds = hoas.map((h) => h.id);
  const soon = addHours(new Date(), 24);

  const items = hoaIds.length
    ? await prisma.request
        .findMany({
          where: {
            hoaId: { in: hoaIds },
            kind: RequestKind.RESIDENT_REQUEST,
            OR: [
              { status: { in: [RequestStatus.NEW, RequestStatus.NEEDS_INFO, RequestStatus.AWAITING_REPLY] } },
              { slaDueAt: { lte: soon } },
            ],
          },
          orderBy: [
            { status: "asc" },
            { priority: "desc" },
            { slaDueAt: "asc" },
            { updatedAt: "desc" },
          ],
          take: 50,
          include: { resident: true },
        })
        .then((requests) =>
          requests.map((req) => ({
            id: req.id,
            summary: req.summary ?? req.subject,
            residentName: req.resident?.name ?? null,
            residentEmail: req.resident?.email ?? "",
            category: req.category,
            priority: req.priority,
            status: req.status,
            slaDueAt: req.slaDueAt?.toISOString() ?? null,
            updatedAt: req.updatedAt.toISOString(),
          })),
        )
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">Inbox</p>
        <h1 className="text-3xl font-semibold text-slate-900">Needs your attention</h1>
        <p className="text-sm text-slate-600">Focused triage. No clutter.</p>
      </header>

      {items.length === 0 ? (
        <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">
          Nothing requires attention right now.
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/app/requests/${item.id}`} className="block">
              <GlassPanel className="group flex flex-col gap-2 border border-[var(--color-border)] bg-white/80 p-4 transition hover:border-[var(--color-ink)]/20">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-base font-semibold text-[var(--color-ink)] leading-relaxed">
                    {item.summary ?? "No summary yet."}
                  </p>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]", statusTone(item.status))}>
                    {item.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
                  <span className="font-semibold text-[var(--color-ink)]">{item.residentName ?? "Unknown"}</span>
                  <span className="text-[11px] text-[var(--color-muted)]">{item.residentEmail}</span>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[12px] font-semibold", pill(item.priority))}>{item.priority}</span>
                  <span className="inline-flex items-center rounded-full border border-[var(--color-border)] px-2 py-1 text-[12px] font-semibold text-[var(--color-ink)]">
                    {item.category}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--color-ink)]">{formatSla(item.slaDueAt)}</span>
                </div>
              </GlassPanel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
