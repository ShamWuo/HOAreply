import Link from "next/link";
import { RequestPriority, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { InboxRefreshButton } from "@/components/inbox/refresh-button";
import { getInboxItemsForUser } from "@/lib/queries/inbox";

function pill(priority: RequestPriority) {
  if (priority === RequestPriority.URGENT) return "border-rose-200 text-rose-800 bg-rose-50";
  if (priority === RequestPriority.HIGH) return "border-amber-200 text-amber-800 bg-amber-50";
  return "border-slate-200 text-slate-700 bg-white";
}

function friendlyLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeLine(summary: string | null | undefined, fallback: string | null | undefined) {
  const raw = (summary || fallback || "").trim();
  if (!raw) return "Pending summary";
  const firstLine = raw.split(/\r?\n/)[0];
  const withoutLabel = firstLine.replace(/^(issue|context|risk level|suggested next step)\s*:\s*/i, "");
  return withoutLabel.endsWith(".") ? withoutLabel : `${withoutLabel}`;
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.OPEN]: "Open",
  [RequestStatus.IN_PROGRESS]: "In progress",
  [RequestStatus.NEEDS_INFO]: "Needs info",
  [RequestStatus.RESOLVED]: "Resolved",
  [RequestStatus.CLOSED]: "Closed",
};

function statusTone(status: RequestStatus) {
  if (status === RequestStatus.OPEN) return "text-emerald-800 bg-emerald-50 border-emerald-200";
  if (status === RequestStatus.IN_PROGRESS) return "text-blue-800 bg-blue-50 border-blue-200";
  if (status === RequestStatus.NEEDS_INFO) return "text-amber-800 bg-amber-50 border-amber-200";
  if (status === RequestStatus.RESOLVED) return "text-slate-800 bg-slate-100 border-slate-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function formatSla(slaDueAt: string | null) {
  if (!slaDueAt) return "SLA not set";
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

  const { items } = await getInboxItemsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <header className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">Inbox</p>
          <h1 className="text-3xl font-semibold text-slate-900">Needs your attention</h1>
          <p className="text-sm text-slate-600">Focused triage. No clutter.</p>
        </header>
        <InboxRefreshButton />
      </div>

      {items.length === 0 ? (
        <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">
          Nothing requires your attention right now.
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/app/requests/${item.id}`} className="block">
              <GlassPanel className="group flex flex-col gap-2 border border-[var(--color-border)] bg-white/80 p-4 transition hover:border-[var(--color-ink)]/20">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-base font-semibold text-[var(--color-ink)] leading-relaxed">
                    {summarizeLine(item.summary, item.subject)}
                  </p>
                  <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold", statusTone(item.status))}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
                  <span className="font-semibold text-[var(--color-ink)]">{item.residentDisplayName || "Unknown resident"}</span>
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink)]">
                    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] px-2 py-1 text-[12px] font-semibold text-[var(--color-ink)]">
                      {friendlyLabel(item.category)}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[12px] font-semibold", pill(item.priority))}>{friendlyLabel(item.priority)}</span>
                    <span className="text-[12px] font-semibold text-[var(--color-ink)]">{formatSla(item.slaDueAt)}</span>
                  </span>
                </div>
              </GlassPanel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
