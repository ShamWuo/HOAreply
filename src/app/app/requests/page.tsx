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
  if (status === RequestStatus.OPEN) return "bg-blue-100 text-blue-800";
  if (status === RequestStatus.IN_PROGRESS) return "bg-indigo-100 text-indigo-800";
  if (status === RequestStatus.NEEDS_INFO) return "bg-amber-100 text-amber-800";
  if (status === RequestStatus.RESOLVED) return "bg-emerald-100 text-emerald-800";
  if (status === RequestStatus.CLOSED) return "bg-slate-200 text-slate-800";
  return "bg-slate-100 text-slate-800";
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.OPEN]: "Open",
  [RequestStatus.IN_PROGRESS]: "In progress",
  [RequestStatus.NEEDS_INFO]: "Needs info",
  [RequestStatus.RESOLVED]: "Resolved",
  [RequestStatus.CLOSED]: "Closed",
};

function friendlyLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTitle(req: Pick<RequestListItem, "subject" | "category">) {
  const cleanSubject = req.subject?.trim();
  if (cleanSubject) return { title: cleanSubject, hint: null as string | null };

  const categoryLabel = req.category.toLowerCase().replace(/_/g, " ");
  return { title: `${categoryLabel} request`, hint: "No subject" };
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
      <header className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">Requests</p>
        <h1 className="text-3xl font-semibold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-600">System of record: everything that has happened or is happening.</p>
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
              <thead className="text-left text-[13px] font-semibold text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60">
                  <th className="px-5 py-3">Resident</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">SLA</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {requests.map((req) => (
                  <tr key={req.id} className="relative hover:bg-slate-50/70">
                    <td className="px-5 py-4 align-top">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{req.residentName ?? "Unknown resident"}</p>
                      <p className="text-xs text-[var(--color-muted)]">{req.residentEmail}</p>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--color-ink)]">
                      {(() => {
                        const title = formatTitle(req);
                        return (
                          <>
                            <p className="text-sm font-semibold">{title.title}</p>
                            <p className="text-[11px] text-[var(--color-muted)]">{title.hint ?? req.subject ?? ""}</p>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="inline-flex rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-ink)]">{friendlyLabel(req.category)}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-semibold", pillColor(req.priority))}>{friendlyLabel(req.priority)}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs", statusColor(req.status))}>{STATUS_LABEL[req.status]}</span>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--color-muted)]">{formatSla(req.slaDueAt)}</td>
                    <td className="px-5 py-4 align-top text-[var(--color-muted)]">{new Date(req.updatedAt).toLocaleString()}</td>
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
