import { cookies } from "next/headers";
import Link from "next/link";
import { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchInbox() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/inbox`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) throw new Error("Failed to load inbox");
  return (await res.json()) as {
    items: {
      id: string;
      summary: string | null;
      residentName: string | null;
      residentEmail: string;
      category: RequestCategory;
      priority: RequestPriority;
      status: RequestStatus;
      slaDueAt: string | null;
      updatedAt: string;
    }[];
    total: number;
  };
}

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
  const { items } = await fetchInbox();

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
