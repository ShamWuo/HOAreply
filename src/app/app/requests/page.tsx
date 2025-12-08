import { cookies } from "next/headers";
import Link from "next/link";
import { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import { RequestsFilters } from "./requests-filters";

type RequestListItem = {
  id: string;
  subject: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
  updatedAt: string;
  residentName: string | null;
  residentEmail: string;
};

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchRequests(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string" && value) params.set(key, value);
  });

  if (params.has("search") && !params.has("q")) {
    const value = params.get("search");
    if (value) params.set("q", value);
    params.delete("search");
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/requests?${params.toString()}`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) {
    throw new Error("Failed to load requests");
  }
  const data = (await res.json()) as { items: RequestListItem[]; total: number };
  return data;
}

function pillColor(priority: RequestPriority) {
  if (priority === RequestPriority.URGENT) return "bg-rose-100 text-rose-800";
  if (priority === RequestPriority.HIGH) return "bg-amber-100 text-amber-800";
  if (priority === RequestPriority.NORMAL) return "bg-slate-100 text-slate-700";
  return "bg-slate-50 text-slate-500";
}

function statusColor(status: RequestStatus) {
  if (status === RequestStatus.NEW || status === RequestStatus.AWAITING_REPLY) return "bg-blue-100 text-blue-800";
  if (status === RequestStatus.NEEDS_INFO) return "bg-amber-100 text-amber-800";
  if (status === RequestStatus.RESOLVED || status === RequestStatus.CLOSED) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-800";
}

function formatSla(slaDueAt: string | null) {
  if (!slaDueAt) return "—";
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((due - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);

  const asText = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (diffMinutes < 0) {
    return `Overdue by ${asText(Math.max(1, absMinutes))}`;
  }

  if (diffMinutes <= 60) {
    return `Due in ${asText(Math.max(1, diffMinutes))}`;
  }

  return `Due in ${asText(diffMinutes)}`;
}

type PageProps = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestsPage({ searchParams }: PageProps) {
  const resolvedSearch = await searchParams;
  const { items: requests, total } = await fetchRequests(resolvedSearch);
  const hasFilters = Boolean(resolvedSearch.status || resolvedSearch.priority || resolvedSearch.category || resolvedSearch.q);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Requests</p>
        <h1 className="text-3xl font-semibold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-600">All resident communications, structured and tracked.</p>
        <p className="text-xs text-slate-500">{total} request{total === 1 ? "" : "s"} found</p>
      </header>

      <RequestsFilters resolvedSearch={resolvedSearch} />

      <GlassPanel className="p-0">
        {requests.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--color-muted)]">
            {hasFilters ? "No requests match these filters." : "No requests yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-2">Resident</th>
                  <th className="px-4 py-2">Subject / Summary</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">SLA Due</th>
                  <th className="px-4 py-2">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {requests.map((req) => (
                  <tr key={req.id} className="relative hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[var(--color-ink)]">{req.residentName ?? "Unknown"}</p>
                      <p className="text-xs text-[var(--color-muted)]">{req.residentEmail}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-[var(--color-ink)]">
                      {req.subject || "No subject provided"}
                      <div className="text-[11px] text-[var(--color-muted)]">{req.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{req.category}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", pillColor(req.priority))}>{req.priority}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusColor(req.status))}>{req.status}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-[var(--color-muted)]">{formatSla(req.slaDueAt)}</td>
                    <td className="px-4 py-3 align-top text-[var(--color-muted)]">{new Date(req.updatedAt).toLocaleString()}</td>
                    <Link href={`/app/requests/${req.id}`} className="absolute inset-0" aria-label={`Open request ${req.subject || req.id}`} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
