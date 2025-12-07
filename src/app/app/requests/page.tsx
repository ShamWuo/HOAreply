import { cookies } from "next/headers";
import Link from "next/link";
import { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client";
import { RequestFilters } from "@/components/requests/filters";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type RequestListItem = {
  id: string;
  subject: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
  updatedAt: string;
  hasLegalRisk: boolean;
  missingInfo: string[] | null;
  resident: { name: string | null; email: string | null } | null;
  hoa: { id: string; name: string };
  thread?: { unreadCount: number };
};

async function cookieHeader() {
  const store = await cookies();
  const all = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return all;
}

async function fetchRequests(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });

  // Normalize legacy search param to q for API compatibility
  if (params.has("search") && !params.has("q")) {
    const value = params.get("search");
    if (value) params.set("q", value);
    params.delete("search");
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const cookie = await cookieHeader();
  const res = await fetch(`${baseUrl}/api/requests?${params.toString()}`, {
    cache: "no-store",
    headers: {
      cookie
    },
  });
  if (!res.ok) {
    throw new Error("Failed to load requests");
  }
  const data = (await res.json()) as { requests: RequestListItem[] };
  return data.requests;
}

const STATUS_ORDER: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.AWAITING_REPLY,
  RequestStatus.NEEDS_INFO,
  RequestStatus.IN_PROGRESS,
  RequestStatus.RESOLVED,
  RequestStatus.CLOSED,
];

const PRIORITY_ORDER: RequestPriority[] = [
  RequestPriority.URGENT,
  RequestPriority.HIGH,
  RequestPriority.NORMAL,
  RequestPriority.LOW,
];

function badgeColor(status: RequestStatus) {
  if (status === RequestStatus.NEW || status === RequestStatus.AWAITING_REPLY) return "bg-blue-100 text-blue-800";
  if (status === RequestStatus.NEEDS_INFO) return "bg-amber-100 text-amber-800";
  if (status === RequestStatus.RESOLVED || status === RequestStatus.CLOSED) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-800";
}

function priorityColor(priority: RequestPriority) {
  if (priority === RequestPriority.URGENT || priority === RequestPriority.HIGH) return "bg-red-100 text-red-800";
  if (priority === RequestPriority.NORMAL) return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

type PageProps = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestsPage({ searchParams }: PageProps) {
  const resolvedSearch = await searchParams;
  const requests = await fetchRequests(resolvedSearch);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Requests</p>
          <h1 className="text-3xl font-semibold text-slate-900">Resident requests</h1>
          <p className="text-sm text-slate-600">Filter by status, priority, category, legal risk, or search by resident/subject.</p>
        </div>
        <Link
          href="/app/policies"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"
        >
          Manage policies
        </Link>
      </div>

      <RequestFilters
        statuses={STATUS_ORDER}
        priorities={PRIORITY_ORDER}
        categories={[
          RequestCategory.MAINTENANCE,
          RequestCategory.VIOLATION,
          RequestCategory.BILLING,
          RequestCategory.GENERAL,
          RequestCategory.BOARD,
          RequestCategory.LEGAL,
          RequestCategory.SPAM,
        ]}
      />

      <GlassPanel className="p-4">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
            No requests match these filters yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Resident</th>
                  <th className="px-3 py-2">HOA</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">SLA</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <Link href={`/app/requests/${req.id}`} className="font-semibold text-slate-900 hover:underline">
                        {req.subject || "Untitled request"}
                      </Link>
                      <div className="text-[11px] text-slate-500">{req.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {req.resident?.name ?? "Unknown"}{" "}
                      <span className="text-slate-500">{req.resident?.email ? `| ${req.resident.email}` : ""}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{req.hoa.name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {req.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", priorityColor(req.priority))}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", badgeColor(req.status))}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{req.slaDueAt ? new Date(req.slaDueAt).toLocaleString() : "\u2014"}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        {req.hasLegalRisk ? (
                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">
                            Legal
                          </span>
                        ) : null}
                        {req.missingInfo?.length ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                            Missing info
                          </span>
                        ) : null}
                        {req.thread?.unreadCount ? (
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                            {req.thread.unreadCount} unread
                          </span>
                        ) : null}
                        {!req.hasLegalRisk && !req.missingInfo?.length && !req.thread?.unreadCount ? "—" : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{new Date(req.updatedAt).toLocaleString()}</td>
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
