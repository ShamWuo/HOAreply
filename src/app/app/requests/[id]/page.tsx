import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestKind, RequestPriority, RequestStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";

type RequestDetail = {
  id: string;
  subject: string;
  summary?: string | null;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  slaDueAt: string | null;
  missingInfo: string[] | null;
  resident: { name: string | null; email: string | null } | null;
  hoa: { id: string; name: string };
  kind: RequestKind;
  hasLegalRisk?: boolean;
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
  drafts: Array<{ id: string; content: string; createdAt: string; approvedAt: string | null; templateId: string | null; source: "TEMPLATE" | "MANUAL" | "MODIFIED_FROM_TEMPLATE" }>;
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

async function fetchTemplates(): Promise<{ policies: Array<{ id: string; hoaId: string; category: RequestCategory; requestStatus: RequestStatus; title: string; bodyTemplate: string; isActive: boolean; isDefault: boolean }>; }> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/policies`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) throw new Error("Failed to load templates");
  const data = await res.json();
  return { policies: data.policies };
}

function formatSla(slaDueAt: string | null) {
  if (!slaDueAt) return "No SLA";
  return new Date(slaDueAt).toLocaleString();
}

function friendlyMissingInfo(items: string[] | null | undefined) {
  if (!items?.length) return null;
  return items.map((item) => {
    const key = item.toLowerCase();
    if (key.includes("unit")) return "Unit or lot number is missing";
    if (key.includes("account")) return "Billing account identifier is missing";
    if (key.includes("rule")) return "Cited rule/section is missing";
    if (key.includes("date") || key.includes("time")) return "Date/time of incident is missing";
    if (key.includes("arc_form")) return "ARC form is missing";
    if (key.includes("description")) return "Request description is missing";
    if (key.includes("location")) return "Location or unit for violation is missing";
    return `${item.replaceAll("_", " ")}`;
  });
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

function deriveRisk(request: RequestDetail) {
  if (request.hasLegalRisk) return "Legal-Sensitive";
  if (request.category === RequestCategory.VIOLATION || request.category === RequestCategory.BOARD)
    return "Policy-Sensitive";
  return "Neutral";
}

function deriveNextStep(request: RequestDetail, isResidentRequest: boolean, hasMissingInfo: boolean, hasDraft: boolean) {
  if (!isResidentRequest) return "No response needed";
  if (hasMissingInfo) return "Request info";
  if (!hasDraft) return "Draft response";
  return "Review";
}

function deriveRequestTitle(request: RequestDetail) {
  return (request.summary ?? request.subject ?? "Resident request").split("\n")[0].trim();
}

function templateResolutionLabel({
  draft,
  request,
  templates,
}: {
  draft?: { templateId: string | null; source?: string | null } | null;
  request: RequestDetail;
  templates: Array<{ id: string; title: string; isDefault: boolean }>;
}) {
  const hit = draft?.templateId ? templates.find((tpl) => tpl.id === draft.templateId) : null;
  if (hit) {
    return `${hit.title} ${hit.isDefault ? "(Default)" : ""}`.trim();
  }
  return `${friendlyLabel(request.category)} · ${STATUS_LABEL[request.status]} · System default template`;
}

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = params ? await params : { id: "" };
  const request = await fetchRequest(id);
  const { policies } = await fetchTemplates();
  const matchingTemplates = policies
    .filter((tpl) => tpl.hoaId === request.hoa.id && tpl.category === request.category && tpl.requestStatus === request.status && tpl.isActive)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const draft = request.drafts[0];
  const hasDraft = Boolean(draft?.content?.trim());
  const isResidentRequest = request.kind === RequestKind.RESIDENT && Boolean(request.resident?.email);
  const hasMissingInfo = Boolean(request.missingInfo?.length);
  const missingInfoLines = friendlyMissingInfo(request.missingInfo);
  const requestLine = deriveRequestTitle(request);
  const contextLine = [request.resident?.name || request.resident?.email, request.hoa.name].filter(Boolean).join(" · ") || "Resident context unavailable";
  const riskLevel = deriveRisk(request);
  const suggestedNext = deriveNextStep(request, isResidentRequest, hasMissingInfo, hasDraft);
  const nonResidentNotice = request.kind !== RequestKind.RESIDENT || !request.resident?.email;
  const templateLabel = templateResolutionLabel({ draft, request, templates: matchingTemplates });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Request</p>
          <h1 className="text-3xl font-semibold text-slate-900">{requestLine || "Resident request"}</h1>
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

      <div className="space-y-6">
        <GlassPanel className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Request Summary (internal)</p>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Do not send</span>
          </div>
          <div className="space-y-3 text-sm text-[var(--color-ink)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Request</p>
              <p className="text-base font-semibold text-[var(--color-ink)] leading-relaxed">{requestLine || "Resident request"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Context</p>
              <p>{contextLine}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Risk Level</p>
                <p>{riskLevel}</p>
                <p className="text-[11px] text-[var(--color-muted)]">Flagged due to language patterns. Informational only. Not legal advice.</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Suggested Next Step</p>
                <p>{suggestedNext}</p>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="space-y-3 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Classification & Routing</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <DataPoint label="Request type" value={isResidentRequest ? "Resident request" : "Non-resident / external"} />
            <DataPoint label="Category" value={friendlyLabel(request.category)} />
            <DataPoint label="Priority" value={friendlyLabel(request.priority)} />
            <DataPoint label="Status" value={STATUS_LABEL[request.status]} />
            <DataPoint label="SLA" value={formatSla(request.slaDueAt)} />
          </div>
          {nonResidentNotice ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This message is not a resident request and does not require HOA action.
            </div>
          ) : null}
        </GlassPanel>

        {missingInfoLines?.length ? (
          <GlassPanel className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Missing Information (blocks sending)</p>
              <span className="text-[11px] text-[var(--color-muted)]">Sending unlocks automatically once filled.</span>
            </div>
            <ul className="space-y-1 text-sm text-[var(--color-ink)]">
              {missingInfoLines.map((line) => (
                <li key={line} className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
                  <span className="text-[12px] font-semibold text-amber-700">[ ]</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--color-muted)]">These come from the email and required HOA fields. Ask plainly; avoid internal labels.</p>
          </GlassPanel>
        ) : null}

        <GlassPanel className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Email Thread</p>
            <span className="text-[11px] text-[var(--color-muted)]">{request.thread?.messages.length ?? 0} messages</span>
          </div>
          <div className="space-y-3">
            {request.thread?.messages.length ? (
              request.thread.messages
                .slice()
                .reverse()
                .map((msg) => (
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

        <GlassPanel className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Draft</p>
            {!hasDraft ? <span className="text-[11px] text-[var(--color-muted)]">Optional</span> : null}
          </div>

          <TemplatePicker
            requestId={request.id}
            templates={matchingTemplates}
            hasDraft={hasDraft}
            currentSource={draft?.source}
          />

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
            Draft generated using: <span className="font-semibold text-[var(--color-ink)]">{templateLabel}</span>
            <br />
            Resolution order: Category + Status → Category default → System default.
          </div>

          <form action={`/api/requests/${request.id}/draft`} method="post" className="space-y-3">
            <textarea
              name="content"
              defaultValue={draft?.content ?? ""}
              placeholder={hasDraft ? "" : "No draft yet. Keep language neutral."}
              className="min-h-[200px] w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
            />
            <p className="text-xs text-[var(--color-muted)]">Keep replies factual. Ask for missing details first. Never promise timelines or use internal jargon.</p>
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              Save Draft
            </button>
          </form>

          {draft?.source === "TEMPLATE" ? (
            <p className="text-[11px] text-[var(--color-muted)]">Draft is based on a template. Review before sending.</p>
          ) : null}
          {draft?.source === "MODIFIED_FROM_TEMPLATE" ? (
            <p className="text-[11px] font-semibold text-amber-700">Modified from template. Ensure wording still matches approved language.</p>
          ) : null}
        </GlassPanel>

        <GlassPanel className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Actions</p>
            <span className="text-[11px] text-[var(--color-muted)]">We never send without approval.</span>
          </div>
          <ActionGroup
            requestId={request.id}
            hasDraft={hasDraft}
            isResidentRequest={isResidentRequest}
            hasMissingInfo={hasMissingInfo}
          />
        </GlassPanel>

        <GlassPanel className="space-y-3 p-6">
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
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</p>
      <p className="text-sm text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function ActionGroup({
  requestId,
  hasDraft,
  isResidentRequest,
  hasMissingInfo,
}: {
  requestId: string;
  hasDraft: boolean;
  isResidentRequest: boolean;
  hasMissingInfo: boolean;
}) {
  const nonResident = !isResidentRequest;
  const needsInfo = hasMissingInfo;
  const reviewReady = isResidentRequest && !needsInfo;

  if (nonResident) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--color-muted)]">External or non-resident messages should not receive HOA replies.</p>
        <form action={`/api/requests/${requestId}`} method="post">
          <input type="hidden" name="action" value="close-non-request" />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Mark as non-request & Close
          </button>
        </form>
      </div>
    );
  }

  if (needsInfo) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--color-muted)]">Ask for the missing details above. Sending unlocks automatically when the info arrives.</p>
        <button
          type="button"
          disabled
          className="inline-flex w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-muted)]"
        >
          Send reply (disabled until info is collected)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-muted)]">Approve before sending. Drafts are never auto-sent.</p>
      <form action={`/api/requests/${requestId}/approve`} method="post">
        <button
          type="submit"
          disabled={!hasDraft}
          className={cn(
            "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
            hasDraft
              ? "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
              : "cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
          )}
        >
          Approve draft
        </button>
      </form>
      <form action={`/api/requests/${requestId}/send`} method="post">
        <button
          type="submit"
          disabled={!hasDraft || !reviewReady}
          className={cn(
            "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
            hasDraft && reviewReady
              ? "border border-[var(--color-border)] bg-[var(--color-ink)] text-white"
              : "cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
          )}
        >
          Send reply
        </button>
      </form>
    </div>
  );
}

function TemplatePicker({
  requestId,
  templates,
  hasDraft,
  currentSource,
}: {
  requestId: string;
  templates: Array<{ id: string; title: string; isDefault: boolean }>;
  hasDraft: boolean;
  currentSource?: string;
}) {
  if (!templates.length) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
        No active templates for this category and status.
      </div>
    );
  }

  return (
    <form action={`/api/requests/${requestId}/draft`} method="post" className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Apply template</p>
        {currentSource === "TEMPLATE" ? <span className="text-[11px] text-[var(--color-muted)]">Applied</span> : null}
      </div>
      <select name="applyTemplateId" className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm">
        {templates.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.title} {tpl.isDefault ? "(Default)" : ""}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-[var(--color-muted)]">Applying replaces the current draft with approved language. Drafts are never auto-sent.</p>
      <p className="text-[11px] text-[var(--color-muted)]">If no HOA template exists, the system defaults (above) are used automatically.</p>
      <button
        type="submit"
        className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
      >
        Apply Template
      </button>
      {hasDraft ? <p className="text-[11px] text-[var(--color-muted)]">Current draft will be replaced.</p> : null}
    </form>
  );
}
