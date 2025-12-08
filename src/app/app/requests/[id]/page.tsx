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
      receivedAt: string;
    }>;
  } | null;
  drafts: Array<{ id: string; content: string; createdAt: string; approvedAt: string | null }>;
  auditLogs: Array<{
    id: string;
    action: string;
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

function pill(text: string) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700">{text}</span>;
}

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = params ? await params : { id: "" };
  const request = await fetchRequest(id);
  const draft = request.drafts[0];
  const hasDraft = Boolean(draft?.content?.trim());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Request</p>
          <h1 className="text-3xl font-semibold text-slate-900">{request.subject || "Untitled request"}</h1>
          <p className="text-sm text-slate-600">
            {request.resident?.name ?? "Unknown resident"}
            {request.resident?.email ? ` · ${request.resident.email}` : ""}
            {" · "}
            {request.hoa.name}
          </p>
        </div>
        <Link href="/app/requests" className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Back to requests
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <GlassPanel className="p-6 space-y-4">
            <div className="space-y-2 text-sm text-[var(--color-muted)]">
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">
                {pill(request.category)}
                {pill(`Priority: ${request.priority}`)}
                {pill(request.status)}
                {request.slaDueAt ? pill(`SLA ${new Date(request.slaDueAt).toLocaleString()}`) : null}
              </div>
              <p className="text-sm text-[var(--color-muted)]">SLA indicator: {request.slaDueAt ? new Date(request.slaDueAt).toLocaleString() : "Not set"}</p>
            </div>
            {request.missingInfo?.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em]">Missing info</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {request.missingInfo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Email Thread</p>
              <span className="text-[11px] text-[var(--color-muted)]">{request.thread?.messages.length ?? 0} messages</span>
            </div>
            <div className="space-y-3">
              {request.thread?.messages.length ? (
                request.thread.messages.map((msg) => (
                  <div key={msg.id} className="rounded-md border border-[var(--color-border)] bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-sm text-[var(--color-ink)]">
                      <span className="font-semibold">{msg.direction === "INCOMING" ? msg.from : msg.to}</span>
                      <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
                        {msg.direction === "INCOMING" ? "Inbound" : "Outbound"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)]">{new Date(msg.receivedAt).toLocaleString()}</p>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink)]">{msg.bodyText}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-muted)]">
                  No messages yet.
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel className="p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Current Status</p>
            <p className="text-sm text-[var(--color-ink)]">{request.status}</p>
          </GlassPanel>

          <GlassPanel className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Reply Draft</p>
              {!hasDraft ? <span className="text-[11px] text-[var(--color-muted)]">No draft generated yet.</span> : null}
            </div>
            <form action={`/api/requests/${request.id}/draft`} method="post" className="space-y-3">
              <textarea
                name="content"
                defaultValue={draft?.content ?? ""}
                placeholder={hasDraft ? "" : "No draft yet."}
                className="min-h-[220px] w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Save Draft
              </button>
            </form>
          </GlassPanel>

          <GlassPanel className="p-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Actions</p>
            <div className="flex flex-col gap-2">
              <form action={`/api/requests/${request.id}/regenerate`} method="post">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Regenerate Draft
                </button>
              </form>
              <form action={`/api/requests/${request.id}/approve`} method="post">
                <button
                  type="submit"
                  disabled={!hasDraft}
                  title={!hasDraft ? "No draft to approve" : undefined}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
                    hasDraft
                      ? "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
                      : "cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
                  )}
                >
                  Approve Draft
                </button>
              </form>
              <form action={`/api/requests/${request.id}/send`} method="post">
                <button
                  type="submit"
                  disabled={!hasDraft}
                  title={!hasDraft ? "No draft to send" : undefined}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
                    hasDraft
                      ? "border border-[var(--color-border)] bg-[var(--color-ink)] text-white"
                      : "cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
                  )}
                >
                  Send Reply
                </button>
              </form>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Audit Log</p>
            <div className="space-y-3">
              {request.auditLogs.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No audit entries yet.</p>
              ) : (
                request.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{log.action}</span>
                      <span className="text-[11px] text-[var(--color-muted)]">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">{log.user?.name ?? log.user?.email ?? "System"}</p>
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
