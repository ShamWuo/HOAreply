import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";

type RequestDetail = {
  id: string;
  subject: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
  missingInfo: string[] | null;
  hasLegalRisk: boolean;
  resident: { name: string | null; email: string | null } | null;
  hoa: { id: string; name: string };
  thread: {
    id: string;
    messages: Array<{
      id: string;
      direction: "INCOMING" | "OUTGOING";
      from: string;
      to: string;
      bodyText: string;
      bodyHtml: string | null;
      receivedAt: string;
    }>;
  } | null;
  drafts: Array<{ id: string; content: string; createdAt: string; approvedAt: string | null }>;
  auditLogs: Array<{
    id: string;
    action: string;
    metadata: unknown;
    createdAt: string;
    user: { name: string | null; email: string | null } | null;
  }>;
};

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchRequest(id: string) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/requests/${id}`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) {
    throw new Error("Request not found");
  }
  const data = (await res.json()) as { request: RequestDetail };
  return data.request;
}

function badge(color: string, text: string) {
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em]", color)}>{text}</span>;
}

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = params ? await params : { id: "" };
  const request = await fetchRequest(id);
  const draft = request.drafts[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Request</p>
          <h1 className="text-3xl font-semibold text-slate-900">{request.subject || "Untitled request"}</h1>
          <p className="text-sm text-slate-600">
            {request.resident?.name ?? "Unknown resident"} {request.resident?.email ? `| ${request.resident.email}` : ""} | {request.hoa.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
            {badge("bg-slate-900 text-white", request.status)}
            {badge("bg-slate-100 text-slate-800", request.category)}
            {badge("bg-slate-100 text-slate-800", `Priority: ${request.priority}`)}
            {request.slaDueAt ? badge("bg-amber-100 text-amber-800", `SLA ${new Date(request.slaDueAt).toLocaleString()}`) : null}
            {request.hasLegalRisk ? badge("bg-red-100 text-red-700", "Legal risk") : null}
            {request.missingInfo?.length ? badge("bg-amber-50 text-amber-800", "Missing info") : null}
          </div>
        </div>
        <Link href="/app/requests" className="text-sm font-semibold text-blue-600 hover:underline">
          Back to requests
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassPanel className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Messages</p>
              <p className="text-[11px] text-slate-500">{request.thread?.messages.length ?? 0} items</p>
            </div>
            <div className="space-y-3">
              {request.thread?.messages.length ? (
                request.thread.messages.map((msg) => (
                  <div key={msg.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{msg.direction === "INCOMING" ? msg.from : msg.to}</p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{msg.direction === "INCOMING" ? "Incoming" : "Outgoing"}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{new Date(msg.receivedAt).toLocaleString()}</p>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{msg.bodyText}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
                  No messages yet.
                </div>
              )}
            </div>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Request status</p>
              <span className="text-[11px] text-slate-500">{request.id.slice(0, 8)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {badge("bg-slate-900 text-white", request.status)}
              {badge("bg-slate-100 text-slate-800", request.category)}
              {badge("bg-slate-100 text-slate-800", `Priority: ${request.priority}`)}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700">
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">SLA</dt>
              <dd>{request.slaDueAt ? new Date(request.slaDueAt).toLocaleString() : "Not set"}</dd>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Resident</dt>
              <dd>
                {request.resident?.name ?? "Unknown"}
                {request.resident?.email ? ` | ${request.resident.email}` : ""}
              </dd>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">HOA</dt>
              <dd>{request.hoa.name}</dd>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Flags</dt>
              <dd>
                {request.hasLegalRisk ? "Legal risk" : "None"}
                {request.missingInfo?.length ? ` | Missing info (${request.missingInfo.length})` : ""}
              </dd>
            </dl>
            {request.missingInfo?.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em]">Missing info</p>
                <ul className="list-disc space-y-1 pl-4">
                  {request.missingInfo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {request.hasLegalRisk ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em]">Legal risk flagged</p>
                <p>Coordinate with counsel before sending a response.</p>
              </div>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Reply draft</p>
              {draft?.approvedAt ? (
                <span className="text-[11px] font-semibold text-emerald-700">Approved</span>
              ) : (
                <span className="text-[11px] text-slate-500">Needs approval</span>
              )}
            </div>
            <form action={`/api/requests/${request.id}/draft`} method="post" className="space-y-3">
              <textarea
                name="content"
                defaultValue={draft?.content ?? ""}
                placeholder={draft ? "" : "No draft yet. Add one or regenerate."}
                className="min-h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300"
              >
                Save draft
              </button>
            </form>
            <form action={`/api/requests/${request.id}/regenerate`} method="post">
              <button
                type="submit"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300"
              >
                Regenerate draft
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <form action={`/api/requests/${request.id}/approve`} method="post">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  Approve draft
                </button>
              </form>
              <form action={`/api/requests/${request.id}/send`} method="post">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl border border-blue-300 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                >
                  Send reply
                </button>
              </form>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Audit log</p>
            <div className="space-y-3">
              {request.auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No audit entries yet.</p>
              ) : (
                request.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{log.action}</span>
                      <span className="text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {log.user?.name ?? log.user?.email ?? "System"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
