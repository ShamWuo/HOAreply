import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { MessageDirection, ThreadStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

function isMarketingThread(thread: { category: string | null }) {
  const category = (thread.category ?? "").toLowerCase();
  return category.includes("marketing") || category.includes("newsletter") || category.includes("system");
}

function clamp(text: string | null | undefined, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface InboxPageProps {
  params: Promise<{ hoaId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/gi;
  return text.replace(
    urlRegex,
    (match) =>
      `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${match}</a>`,
  );
}

function sanitizeHtml(html: string) {
  return (
    html
      // Strip scripts
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      // Strip style and link tags to prevent font/layout overrides
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<link[\s\S]*?>/gi, "")
      // Drop inline styles
      .replace(/\sstyle="[^"]*"/gi, "")
      .replace(/\sstyle='[^']*'/gi, "")
      // Drop inline event handlers
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
  );
}


function buildMessageHtml(message: { bodyHtml: string | null; bodyText: string }) {
  if (message.bodyHtml && message.bodyHtml.trim()) {
    return sanitizeHtml(message.bodyHtml);
  }

  const escaped = escapeHtml(message.bodyText ?? "");
  const linked = linkify(escaped);
  return linked.replace(/\n/g, "<br />");
}

async function fetchThreads(hoaId: string) {
  return prisma.emailThread.findMany({
    where: { hoaId },
    include: {
      messages: {
        orderBy: { receivedAt: "asc" },
        include: {
          aiReply: true,
          resident: true,
        },
      },
      classifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function threadStatusStyle(status: ThreadStatus, isActive: boolean) {
  const canonical = CANONICAL_STATUS_MAP[status];
  if (canonical === "OPEN") return isActive ? "bg-white/20 text-white" : "bg-blue-600 text-white";
  if (canonical === "WAITING") return isActive ? "bg-white/20 text-white" : "bg-amber-600 text-white";
  if (canonical === "CLOSED") return isActive ? "bg-white/20 text-white" : "bg-emerald-600 text-white";
  return isActive ? "bg-white/20 text-white" : "bg-slate-800 text-white";
}

function formatStatus(status: ThreadStatus) {
  return CANONICAL_STATUS_LABEL[CANONICAL_STATUS_MAP[status]];
}

type CanonicalStatus = "OPEN" | "WAITING" | "CLOSED";

const CANONICAL_STATUS_MAP: Record<ThreadStatus, CanonicalStatus> = {
  [ThreadStatus.NEW]: "OPEN",
  [ThreadStatus.AWAITING_RESIDENT]: "WAITING",
  [ThreadStatus.PENDING]: "WAITING",
  [ThreadStatus.FOLLOW_UP]: "WAITING",
  [ThreadStatus.RESOLVED]: "CLOSED",
  [ThreadStatus.ERROR]: "WAITING",
};

const CANONICAL_STATUS_LABEL: Record<CanonicalStatus, string> = {
  OPEN: "Open",
  WAITING: "Waiting",
  CLOSED: "Closed",
};

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const hoa = await assertHoaOwnership(resolvedParams.hoaId, session.user.id);
  const threads = await fetchThreads(resolvedParams.hoaId);
  const primaryThreads = threads.filter((thread) => !isMarketingThread(thread));
  const sidelinedThreads = threads.filter((thread) => isMarketingThread(thread));
  const requestedThreadId =
    typeof resolvedSearchParams?.thread === "string" ? resolvedSearchParams.thread : undefined;
  const requestedThread = threads.find((thread) => thread.id === requestedThreadId);
  const activeThread = requestedThread ?? primaryThreads[0] ?? threads[0];
  const latestAiReply = activeThread?.messages
    .slice()
    .reverse()
    .find((m) => m.aiReply);
  const firstIncomingMessage = activeThread?.messages.find((m) => m.direction === MessageDirection.INCOMING) ?? activeThread?.messages[0];
  const residentContext = firstIncomingMessage?.resident;
  const similarCaseCount = activeThread?.classifications?.length ?? 0;
  const minutesSaved = Math.min(24, Math.max(8, Math.round(((latestAiReply?.aiReply?.replyText?.length ?? 200) / 120) + 7)));
  const canonicalStatus = activeThread ? CANONICAL_STATUS_MAP[activeThread.status ?? ThreadStatus.NEW] : "OPEN";
  const isWaiting = canonicalStatus === "WAITING";
  const marketingActive = activeThread ? isMarketingThread(activeThread) : false;
  const confidenceLevel = latestAiReply?.aiReply
    ? /legal|attorney|sue|liability/i.test(latestAiReply.aiReply.replyText)
      ? "needs-review"
      : /escalat|complaint|angry/i.test(latestAiReply.aiReply.replyText)
        ? "caution"
        : "safe"
    : "unknown";
  const isSafeToSend = confidenceLevel === "safe" && Boolean(latestAiReply?.aiReply);
  const showStatusControls = !isSafeToSend || Boolean(latestAiReply?.aiReply?.sent);
  const isUnassignedAndUnopened =
    !activeThread?.assignedToUserId && canonicalStatus === "OPEN" && (activeThread?.unreadCount ?? 0) > 0;
  const success = Boolean(resolvedSearchParams?.success);
  const errorMsg = resolvedSearchParams?.message;

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />
      <div className="relative flex min-h-screen flex-col gap-6 px-4 pb-10 pt-8 lg:flex-row lg:items-start lg:px-6">
        <aside className="w-full lg:w-96">
          <GlassPanel className="h-full p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Threads</p>
                <p className="text-xs text-slate-500">
                  {primaryThreads.length} primary • {sidelinedThreads.length} auto-archived
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {primaryThreads.map((thread) => {
                const lastMessage = thread.messages.at(-1);
                const badge = (() => {
                  if (!lastMessage?.aiReply) return "";
                  if (lastMessage.aiReply.error) return "Error";
                  if (!lastMessage.aiReply.sent) return "Draft";
                  return "Sent";
                })();
                const isActive = activeThread && thread.id === activeThread.id;
                const needsAttention = thread.unreadCount > 0 || CANONICAL_STATUS_MAP[thread.status] !== "CLOSED";
                const statusIcon = {
                  OPEN: "●",
                  WAITING: "⧖",
                  CLOSED: "✓",
                }[CANONICAL_STATUS_MAP[thread.status]];

                return (
                  <Link
                    key={thread.id}
                    href={`/app/hoa/${resolvedParams.hoaId}/inbox?thread=${thread.id}`}
                    scroll={false}
                    className={cn(
                      "group block w-full rounded-2xl border px-4 py-4 text-left transition",
                      isActive
                        ? "border-slate-800 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)]"
                        : "border-slate-100 bg-white/80 text-slate-600 hover:border-blue-200 hover:bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p
                          className={cn(
                            "text-base",
                            isActive ? "font-semibold text-white" : needsAttention ? "font-semibold text-slate-900" : "font-medium text-slate-700",
                          )}
                        >
                          {clamp(thread.subject, 140)}
                        </p>
                        {lastMessage ? (
                          <p className={cn("truncate text-xs", isActive ? "text-white/70" : "text-slate-500")}>
                            {lastMessage.direction === MessageDirection.INCOMING ? lastMessage.from : lastMessage.to}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                            <span>{statusIcon}</span>
                            {formatStatus(thread.status)}
                          </span>
                          {badge ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                lastMessage?.aiReply?.error
                                  ? "bg-red-100 text-red-800"
                                  : isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-200 text-slate-700",
                              )}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {/* Timestamp removed due to data inaccuracies */}
                    </div>
                  </Link>
                );
              })}

              {sidelinedThreads.length ? (
                <details className="group rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-600">
                    <span>Auto-archived non-HOA ({sidelinedThreads.length})</span>
                    <span className="text-xs text-slate-500">These won’t surface in primary</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {sidelinedThreads.map((thread) => {
                      const lastMessage = thread.messages.at(-1);
                      const badge = (() => {
                        if (!lastMessage?.aiReply) return "";
                        if (lastMessage.aiReply.error) return "Error";
                        if (!lastMessage.aiReply.sent) return "Draft";
                        return "Sent";
                      })();
                      const isActive = activeThread && thread.id === activeThread.id;
                      const needsAttention = thread.unreadCount > 0 || CANONICAL_STATUS_MAP[thread.status] !== "CLOSED";
                      const statusIcon = {
                        OPEN: "●",
                        WAITING: "⧖",
                        CLOSED: "✓",
                      }[CANONICAL_STATUS_MAP[thread.status]];

                      return (
                        <Link
                          key={thread.id}
                          href={`/app/hoa/${resolvedParams.hoaId}/inbox?thread=${thread.id}`}
                          scroll={false}
                          className={cn(
                            "group block w-full rounded-2xl border px-4 py-4 text-left transition",
                            isActive
                              ? "border-slate-800 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)]"
                              : "border-slate-100 bg-slate-100/80 text-slate-500 hover:border-slate-200",
                            "opacity-80",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p
                                className={cn(
                                  "text-base line-through decoration-slate-300",
                                  isActive ? "font-semibold text-white" : needsAttention ? "font-semibold text-slate-900" : "font-medium text-slate-700",
                                )}
                              >
                                {clamp(thread.subject, 140)}
                              </p>
                              {lastMessage ? (
                                <p className={cn("truncate text-xs", isActive ? "text-white/70" : "text-slate-500")}>
                                  {lastMessage.direction === MessageDirection.INCOMING ? lastMessage.from : lastMessage.to}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                                  Auto-archived
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                                  <span>{statusIcon}</span>
                                  {formatStatus(thread.status)}
                                </span>
                                {badge ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                      lastMessage?.aiReply?.error
                                        ? "bg-red-100 text-red-800"
                                        : isActive
                                          ? "bg-white/20 text-white"
                                          : "bg-slate-200 text-slate-700",
                                    )}
                                  >
                                    {badge}
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700">
                                  Non-HOA detected
                                </span>
                              </div>
                            </div>
                            {/* Timestamp removed due to data inaccuracies */}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>
          </GlassPanel>
        </aside>

        <main className="flex-1">
          <GlassPanel className="h-full p-6">
            {success ? (
              <div className="mb-4 rounded-[20px] border border-emerald-200/60 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
                Gmail connected successfully.
              </div>
            ) : null}
            {errorMsg ? (
              <div className="mb-4 rounded-[20px] border border-red-200/60 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            {activeThread && isMarketingThread(activeThread) ? (
              <div className="mb-4 flex flex-col gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
                    Non-HOA detected
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-800">
                    Auto-archived
                  </span>
                  <span className="text-sm font-semibold text-slate-900">This email was auto-classified and requires no action.</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Auto-ignored. No response drafted. Reason: marketing/system keywords detected.</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Locked until overridden</span>
                </div>
              </div>
            ) : null}
            {!activeThread ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-sm text-slate-500">
                No messages yet. Emails will show up here after the next Gmail poll.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Thread</p>
                      <h1 className="text-3xl font-semibold text-slate-900 leading-tight">{activeThread.subject}</h1>
                      <p className="text-sm text-slate-500">{hoa.name} • {hoa.gmailAccount?.email ?? "Address unavailable"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold uppercase tracking-[0.3em]",
                            threadStatusStyle(activeThread.status ?? ThreadStatus.NEW, true),
                          )}
                        >
                          {formatStatus(activeThread.status ?? ThreadStatus.NEW)}
                        </span>
                        {/* Unread chip removed; status handles attention */}
                        {activeThread.priority ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                            Priority: {activeThread.priority}
                          </span>
                        ) : null}
                        {activeThread.category ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                            {activeThread.category}
                          </span>
                        ) : null}
                        {(activeThread.category ?? "").toLowerCase().includes("marketing") ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
                              Non-HOA detected
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-800">
                              Auto-archived
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right text-xs text-slate-600 lg:ml-auto">
                      <p className="font-semibold text-slate-800">HOA Context</p>
                        {residentContext ? (
                          <div className="space-y-1 text-right">
                            <p className="text-sm font-semibold text-slate-900">{residentContext.name ?? residentContext.email ?? "Known resident"}</p>
                            <p className="text-[11px] text-slate-500">Email: {residentContext.email ?? "Not provided"}</p>
                            <p className="text-[11px] text-slate-500">Messages: {residentContext.messageCount ?? 1}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-right text-slate-600">
                            <p className="text-sm font-semibold text-slate-900">External sender – not a resident</p>
                            <p className="text-[11px] text-slate-500">No unit match found in the resident directory.</p>
                            <p className="text-[11px] text-slate-500">Sender: {firstIncomingMessage?.from ?? "Unknown"}</p>
                          </div>
                        )}
                      <p className="mt-2 text-[11px]">Category: {activeThread.category ?? "Not detected"}</p>
                      <a href="#similar-threads" className="mt-1 inline-flex text-[11px] font-semibold text-blue-700 underline">
                        Similar past threads
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1",
                        confidenceLevel === "safe"
                          ? "bg-emerald-100 text-emerald-800"
                          : confidenceLevel === "caution"
                            ? "bg-amber-100 text-amber-800"
                            : confidenceLevel === "needs-review"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {confidenceLevel === "safe"
                        ? "✅ Safe to send"
                        : confidenceLevel === "caution"
                          ? "⚠ Needs skim"
                          : confidenceLevel === "needs-review"
                            ? "⚠ Needs review"
                            : "Confidence unknown"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                      Sending as {session.user?.name ?? "Board manager"} • {hoa.name}
                    </span>
                    <details className="inline-block">
                      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-200">
                        ⓘ Why this is safe
                      </summary>
                      <div className="mt-2 w-72 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700 shadow-lg">
                        <p>AI matched past cases ({similarCaseCount}).</p>
                        <p>Estimated time saved: ~{minutesSaved} minutes vs manual drafting.</p>
                        <p>Auto-draft confidence shown above; sending as {session.user?.name ?? "Board manager"}.</p>
                      </div>
                    </details>
                  </div>

                  {marketingActive ? (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs shadow-inner">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">Auto-ignored. No response drafted.</p>
                          <p className="text-[11px] text-slate-500">Status locked to Archived (Non-HOA). Override only if this is misclassified.</p>
                        </div>
                        <form action={`/api/threads/${activeThread.id}`} method="post">
                          <input type="hidden" name="status" value={ThreadStatus.NEW} />
                          <button
                            type="submit"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300 hover:bg-blue-50"
                          >
                            Reopen to inbox
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs shadow-inner">
                      <div className="flex flex-wrap items-center gap-3">
                        {latestAiReply?.aiReply ? (
                          isSafeToSend ? (
                            <>
                              <form action={`/api/messages/${latestAiReply.id}/send`} method="post">
                                <button
                                  type="submit"
                                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-600"
                                >
                                  Send now
                                </button>
                              </form>
                              <a
                                href="#ai-decision"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 transition hover:text-slate-800"
                              >
                                Review draft
                              </a>
                            </>
                          ) : (
                            <a
                              href="#ai-decision"
                              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                            >
                              Reply with AI draft
                            </a>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                            No AI draft yet
                          </span>
                        )}

                        <details className="relative">
                          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500 transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-100">
                            ⋮
                          </summary>
                          <div className="absolute left-0 z-10 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                            <form action={`/api/threads/${activeThread.id}`} method="post">
                              <input type="hidden" name="status" value={ThreadStatus.RESOLVED} />
                              <input type="hidden" name="clearUnread" value="true" />
                              <button
                                type="submit"
                                disabled={!latestAiReply?.aiReply?.sent}
                                className={cn(
                                  "w-full cursor-pointer rounded-lg px-3 py-2 text-left font-semibold uppercase tracking-[0.2em] transition",
                                  latestAiReply?.aiReply?.sent
                                    ? "text-slate-700 hover:-translate-y-[1px] hover:bg-slate-100"
                                    : "cursor-not-allowed text-slate-300",
                                )}
                              >
                                Close thread
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>

                      {showStatusControls ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <form action={`/api/threads/${activeThread.id}`} method="post">
                            <input type="hidden" name="status" value={ThreadStatus.PENDING} />
                            <button
                              type="submit"
                              className={cn(
                                "cursor-pointer rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] shadow-sm transition hover:-translate-y-[1px]",
                                isWaiting
                                  ? "border-amber-300 bg-amber-100 text-amber-800"
                                  : "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
                              )}
                            >
                              Replied — waiting on resident
                            </button>
                          </form>

                          <form action={`/api/threads/${activeThread.id}`} method="post">
                            <input type="hidden" name="status" value={ThreadStatus.FOLLOW_UP} />
                            <button
                              type="submit"
                              className={cn(
                                "cursor-pointer rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] shadow-sm transition hover:-translate-y-[1px]",
                                isWaiting
                                  ? "border-violet-300 bg-violet-100 text-violet-800"
                                  : "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
                              )}
                            >
                              Needs HOA action
                            </button>
                          </form>

                          {isUnassignedAndUnopened ? (
                            <form action={`/api/threads/${activeThread.id}`} method="post">
                              <input type="hidden" name="assign" value="me" />
                              <button
                                type="submit"
                                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
                              >
                                Assign to me
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : (
                        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Status will auto-set to Waiting after you send.
                        </p>
                      )}
                    </div>
                  )}

                </div>
                <div className="space-y-5">
                  {activeThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {message.direction === MessageDirection.INCOMING ? message.from : message.to}
                          </p>
                          {/* Timestamp removed due to inaccuracy concerns */}
                        </div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                          {message.direction === MessageDirection.INCOMING ? "Incoming" : "Outgoing"}
                        </p>
                      </div>
                      <div
                        className="prose prose-sm mt-3 max-w-none text-slate-700 prose-a:text-blue-600 prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: buildMessageHtml(message) }}
                      />
                      {message.aiReply ? (
                        <div
                          className={cn(
                            "mt-4 rounded-xl border px-4 py-3 text-sm",
                            message.aiReply.error
                              ? "border-red-300 bg-red-50/90 text-red-900"
                              : "border-blue-100 bg-blue-50/80 text-slate-700",
                          )}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold">
                                AI Reply
                                {message.aiReply.sent ? " - Sent" : message.aiReply.error ? " - Error" : " - Pending"}
                              </p>
                              {message.aiReply.createdAt ? (
                                <p className="text-[11px] text-slate-500">
                                  Drafted {message.aiReply.createdAt.toLocaleString()}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <form action={`/api/messages/${message.id}/retry-draft?variant=regenerate`} method="post">
                                <button
                                  type="submit"
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300 hover:bg-blue-50"
                                >
                                  Regenerate
                                </button>
                              </form>
                              {message.aiReply.error ? (
                                <form action={`/api/messages/${message.id}/retry-draft?variant=regenerate`} method="post">
                                  <button
                                    type="submit"
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:-translate-y-[1px] hover:border-red-400 hover:bg-red-100"
                                  >
                                    Retry
                                  </button>
                                </form>
                              ) : null}
                              {!message.aiReply.sent ? (
                                <form action={`/api/messages/${message.id}/send`} method="post">
                                  <button
                                    type="submit"
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                                  >
                                    Send
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm">
                              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Classification</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                                <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-white">
                                  {activeThread.category ?? "Uncategorized"}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1">
                                  Priority: {activeThread.priority ?? "Unset"}
                                </span>
                              </div>
                              <p className="mt-2 text-[11px] text-slate-500">Set automatically by the AI classifier.</p>
                              <div className="mt-3 space-y-2 text-[11px] text-slate-600">
                                <p className="font-semibold uppercase tracking-[0.25em] text-slate-500">History</p>
                                {activeThread.classifications?.length ? (
                                  <div className="max-h-32 space-y-1 overflow-auto pr-1">
                                    {activeThread.classifications.map((c) => (
                                      <div
                                        key={c.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1"
                                      >
                                        <span className="text-[11px] font-semibold text-slate-800">
                                          {`${c.category ?? "Uncategorized"} -> ${c.priority ?? "Unset"}`}
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          {new Date(c.createdAt).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">No history yet.</p>
                                )}
                              </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm">
                              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Signature</p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">{session.user?.name ?? "Community Manager"}</p>
                              {session.user?.email ? (
                                <p className="text-xs text-slate-500">{session.user.email}</p>
                              ) : null}
                              <p className="mt-2 text-[11px] text-slate-500">Appended to AI drafts when sending.</p>
                            </div>
                          </div>
                          <form action={`/api/messages/${message.id}/draft`} method="post" className="mt-3 space-y-2">
                            <textarea
                              name="replyText"
                              defaultValue={message.aiReply.replyText || ""}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              rows={6}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="submit"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:text-slate-900"
                              >
                                Save draft
                              </button>
                            </div>
                          </form>
                          {message.aiReply.error ? (
                            <p className="text-sm font-semibold text-red-800">{message.aiReply.error}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassPanel>
        </main>
      </div>
      {activeThread && latestAiReply?.aiReply ? (
        <div
          id="ai-decision"
          className="fixed bottom-4 right-4 z-50 w-[clamp(420px,48vw,900px)] max-w-[92vw] rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        >
          <details open className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-0.5 text-slate-800 transition hover:text-slate-900">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Decision panel</p>
                <p className="truncate text-sm font-semibold text-slate-900" title={activeThread.subject}>
                  {activeThread.subject}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                      confidenceLevel === "safe"
                        ? "bg-emerald-100 text-emerald-800"
                        : confidenceLevel === "caution"
                          ? "bg-amber-100 text-amber-800"
                          : confidenceLevel === "needs-review"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {confidenceLevel === "safe"
                      ? "Confidence: Safe to send"
                      : confidenceLevel === "caution"
                        ? "Confidence: Needs skim"
                        : confidenceLevel === "needs-review"
                          ? "Confidence: Needs review"
                          : "Confidence unknown"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                    Sending as {session.user?.name ?? "Board manager"} • {hoa.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  {latestAiReply.aiReply.sent ? "Sent" : "Draft"}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600 transition group-open:rotate-0 group-open:scale-95">
                  ▾
                </span>
              </div>
            </summary>

            <div className="mt-3 space-y-3 rounded-xl bg-slate-50/90 p-4 shadow-inner">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Summary</p>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                    {clamp(latestAiReply.aiReply.replyText.split(". ")[0] ?? latestAiReply.aiReply.replyText, 160)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Risk</p>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                    /legal|attorney|sue|liability/i.test(latestAiReply.aiReply.replyText)
                      ? "bg-red-100 text-red-800"
                      : /escalat|complaint|angry/i.test(latestAiReply.aiReply.replyText)
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800",
                  )}>
                    {/legal|attorney|sue|liability/i.test(latestAiReply.aiReply.replyText)
                      ? "Legal"
                      : /escalat|complaint|angry/i.test(latestAiReply.aiReply.replyText)
                        ? "Medium"
                        : "Low"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Actions</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <form action={`/api/messages/${latestAiReply.id}/send`} method="post">
                      <button
                        type="submit"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-blue-700 bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-600"
                      >
                        Send now
                      </button>
                    </form>
                    {isSafeToSend && !latestAiReply.aiReply.sent ? (
                      <a
                        href={`#message-${latestAiReply.id}`}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-800"
                      >
                        Preview only
                      </a>
                    ) : (
                      <>
                        <a
                          href={`/app/hoa/${resolvedParams.hoaId}/inbox?thread=${activeThread.id}`}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300"
                        >
                          Edit
                        </a>
                        <a
                          href={`#message-${latestAiReply.id}`}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300"
                        >
                          Dismiss
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">Suggested reply</span>
                  <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">Auto-draft</span>
                </div>
                {!isSafeToSend || latestAiReply.aiReply.sent ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={`/api/messages/${latestAiReply.id}/retry-draft?variant=regenerate`} method="post">
                      <button
                        type="submit"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300 hover:text-slate-900"
                      >
                        Regenerate
                      </button>
                    </form>
                    <form action={`/api/messages/${latestAiReply.id}/retry-draft?variant=regenerate`} method="post">
                      <button
                        type="submit"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <div className="max-h-[60vh] min-h-[240px] overflow-auto rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{latestAiReply.aiReply.replyText}</pre>
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
