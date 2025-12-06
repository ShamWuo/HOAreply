import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { MessageDirection, ThreadStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

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
      assignedToUser: true,
      classifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function fetchUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function threadStatusStyle(status: ThreadStatus, isActive: boolean) {
  const canonical = CANONICAL_STATUS_MAP[status];
  if (canonical === "NEW") return isActive ? "bg-white/20 text-white" : "bg-blue-600 text-white";
  if (canonical === "WAITING_ON_RESIDENT") return isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white";
  if (canonical === "WAITING_ON_HOA") return isActive ? "bg-white/20 text-white" : "bg-slate-800 text-white";
  if (canonical === "INTERNAL_FYI") return isActive ? "bg-white/20 text-white" : "bg-violet-600 text-white";
  if (canonical === "CLOSED") return isActive ? "bg-white/20 text-white" : "bg-emerald-600 text-white";
  return isActive ? "bg-white/20 text-white" : "bg-slate-800 text-white";
}

function formatStatus(status: ThreadStatus) {
  return CANONICAL_STATUS_LABEL[CANONICAL_STATUS_MAP[status]];
}

function displayUser(user: { name: string | null; email: string } | null | undefined, selfId: string | undefined) {
  if (!user) return "User";
  if (selfId && user.email === selfId) return "You";
  return user.name || user.email;
}

function userInitial(user: { name: string | null; email: string } | null | undefined) {
  if (!user) return "?";
  const source = user.name?.trim() || user.email;
  return source.slice(0, 1).toUpperCase();
}

const THREAD_STATUS_OPTIONS: ThreadStatus[] = [
  ThreadStatus.NEW,
  ThreadStatus.AWAITING_RESIDENT,
  ThreadStatus.PENDING,
  ThreadStatus.FOLLOW_UP,
  ThreadStatus.RESOLVED,
];

type CanonicalStatus = "NEW" | "WAITING_ON_RESIDENT" | "WAITING_ON_HOA" | "INTERNAL_FYI" | "CLOSED";

const CANONICAL_STATUS_MAP: Record<ThreadStatus, CanonicalStatus> = {
  [ThreadStatus.NEW]: "NEW",
  [ThreadStatus.AWAITING_RESIDENT]: "WAITING_ON_RESIDENT",
  [ThreadStatus.PENDING]: "WAITING_ON_HOA",
  [ThreadStatus.FOLLOW_UP]: "INTERNAL_FYI",
  [ThreadStatus.RESOLVED]: "CLOSED",
  [ThreadStatus.ERROR]: "INTERNAL_FYI",
};

const CANONICAL_STATUS_LABEL: Record<CanonicalStatus, string> = {
  NEW: "New",
  WAITING_ON_RESIDENT: "Waiting on Resident",
  WAITING_ON_HOA: "Waiting on HOA",
  INTERNAL_FYI: "Internal / FYI",
  CLOSED: "Closed",
};

const CANONICAL_STATUS_OPTIONS = [
  { label: CANONICAL_STATUS_LABEL.NEW, value: ThreadStatus.NEW },
  { label: CANONICAL_STATUS_LABEL.WAITING_ON_RESIDENT, value: ThreadStatus.AWAITING_RESIDENT },
  { label: CANONICAL_STATUS_LABEL.WAITING_ON_HOA, value: ThreadStatus.PENDING },
  { label: CANONICAL_STATUS_LABEL.INTERNAL_FYI, value: ThreadStatus.FOLLOW_UP },
  { label: CANONICAL_STATUS_LABEL.CLOSED, value: ThreadStatus.RESOLVED },
];

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const hoa = await assertHoaOwnership(resolvedParams.hoaId, session.user.id);
  const pollRuns = hoa.gmailAccount
    ? await prisma.pollRun.findMany({
        where: { gmailAccountId: hoa.gmailAccount.id },
        orderBy: { startedAt: "desc" },
        take: 5,
      })
    : [];
  const users = await fetchUsers();
  const threads = await fetchThreads(resolvedParams.hoaId);
  const requestedThreadId =
    typeof resolvedSearchParams?.thread === "string" ? resolvedSearchParams.thread : undefined;
  const activeThread = threads.find((thread) => thread.id === requestedThreadId) ?? threads[0];
  const latestAiReply = activeThread?.messages
    .slice()
    .reverse()
    .find((m) => m.aiReply);
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
                <p className="text-xs text-slate-500">{threads.length} conversations</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600">
                  {hoa.gmailAccount
                    ? hoa.gmailAccount.lastPollError
                      ? `Poll error: ${clamp(hoa.gmailAccount.lastPollError, 100)}`
                      : hoa.gmailAccount.lastPolledAt
                        ? `Last polled ${hoa.gmailAccount.lastPolledAt.toLocaleString()}`
                        : "Not yet polled"
                    : "Gmail not connected"}
                </span>
                <form action={`/api/hoas/${resolvedParams.hoaId}/poll`} method="post">
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-slate-900"
                  >
                    Refresh
                  </button>
                </form>
                {hoa.gmailAccount?.lastPollError ? (
                  <Link
                    href={`/connect/gmail?hoaId=${resolvedParams.hoaId}`}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
                  >
                    Reconnect Gmail
                  </Link>
                ) : null}
                <Link
                  href="/app/dashboard"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-slate-900"
                >
                  Dashboard
                </Link>
              </div>
            </div>
            {pollRuns.length ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Recent polls</p>
                <div className="mt-2 space-y-2">
                  {pollRuns.map((run) => {
                    const badgeClass =
                      run.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : run.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700";
                    return (
                      <div
                        key={run.id}
                        className="flex items-start justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{new Date(run.startedAt).toLocaleString()}</span>
                          <span className="text-[11px] text-slate-500">
                            {run.completedAt ? `Completed ${new Date(run.completedAt).toLocaleTimeString()}` : "In progress"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
                            {run.status}
                          </span>
                          <span className="text-[11px] text-slate-500">{run.processedCount} msgs</span>
                          {run.error ? (
                            <span className="max-w-[12rem] truncate text-[11px] font-semibold text-red-700" title={run.error}>
                              {clamp(run.error, 80)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-6 space-y-3">
              {threads.map((thread) => {
                const lastMessage = thread.messages.at(-1);
                const badge = (() => {
                  if (!lastMessage?.aiReply) return "";
                  if (lastMessage.aiReply.error) return "Error";
                  if (!lastMessage.aiReply.sent) return "Draft";
                  return "Sent";
                })();
                const isActive = activeThread && thread.id === activeThread.id;
                const isMarketing = (thread.category ?? "").toLowerCase().includes("marketing") || (thread.category ?? "").toLowerCase().includes("newsletter");
                const needsAttention = thread.unreadCount > 0 || CANONICAL_STATUS_MAP[thread.status] !== "CLOSED";
                const statusIcon = {
                  NEW: "●",
                  WAITING_ON_RESIDENT: "⧖",
                  WAITING_ON_HOA: "⟳",
                  INTERNAL_FYI: "◌",
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
                        : isMarketing
                          ? "border-slate-100 bg-slate-100/80 text-slate-500 hover:border-slate-200"
                          : "border-slate-100 bg-white/80 text-slate-600 hover:border-blue-200 hover:bg-white",
                      isMarketing ? "opacity-80" : "",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p
                          className={cn(
                            "text-base",
                            isActive ? "font-semibold text-white" : needsAttention ? "font-semibold text-slate-900" : "font-medium text-slate-700",
                            isMarketing ? "line-through decoration-slate-300" : "",
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
                          {thread.unreadCount ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {thread.unreadCount} new
                            </span>
                          ) : null}
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
                          {isMarketing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                              Marketing / System
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className={cn("text-[11px] font-semibold", isActive ? "text-white/70" : "text-slate-400")}> 
                          {new Date(thread.updatedAt).toLocaleString()}
                        </span>
                        {thread.assignedToUser ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                              {userInitial(thread.assignedToUser)}
                            </span>
                            {displayUser(thread.assignedToUser, session.user?.email ?? session.user?.id)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
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
            {!activeThread ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-sm text-slate-500">
                No messages yet. Emails will show up here after the next Gmail poll.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Thread</p>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-semibold text-slate-900">{activeThread.subject}</h1>
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
                        {activeThread.unreadCount ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 font-semibold text-white">
                            {activeThread.unreadCount} unread
                          </span>
                        ) : null}
                        {activeThread.category ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                            {activeThread.category}
                          </span>
                        ) : null}
                        {activeThread.priority ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                            Priority: {activeThread.priority}
                          </span>
                        ) : null}
                        {(activeThread.category ?? "").toLowerCase().includes("marketing") ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
                            Marketing / System Email
                          </span>
                        ) : null}
                        {activeThread.assignedToUser ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-800">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs uppercase text-white">
                              {userInitial(activeThread.assignedToUser)}
                            </span>
                            Assigned: {displayUser(activeThread.assignedToUser, session.user?.email ?? session.user?.id)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 px-3 py-1 font-semibold text-slate-500">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">HOA Context</p>
                      <p>{activeThread.messages[0]?.resident?.name ?? "Resident name unknown"}</p>
                      <p className="text-[11px]">Unit: {activeThread.messages[0]?.resident?.email ?? "Not provided"}</p>
                      <p className="text-[11px]">Violation: {activeThread.category ?? "Not detected"}</p>
                      <a href="#similar-threads" className="mt-1 inline-flex text-[11px] font-semibold text-blue-700 underline">
                        Similar past threads
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 text-xs shadow-sm">
                    {activeThread.unreadCount ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 font-semibold text-white">
                        {activeThread.unreadCount} unread
                      </span>
                    ) : null}
                    {activeThread.category ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                        Category: {activeThread.category}
                      </span>
                    ) : null}
                    {activeThread.priority ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                        Priority: {activeThread.priority}
                      </span>
                    ) : null}
                      {activeThread.assignedToUser ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-800">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs uppercase text-white">
                            {userInitial(activeThread.assignedToUser)}
                          </span>
                          Assigned: {displayUser(activeThread.assignedToUser, session.user?.email ?? session.user?.id)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 px-3 py-1 font-semibold text-slate-500">
                          Unassigned
                        </span>
                      )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 text-xs shadow-sm">
                    <form action={`/api/threads/${activeThread.id}`} method="post" className="flex items-center gap-2">
                      <label htmlFor="status" className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          id="status"
                          name="status"
                          defaultValue={activeThread.status ?? ThreadStatus.NEW}
                          className="appearance-none rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3 py-2 pr-9 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            {CANONICAL_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
                      >
                        Update
                      </button>
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post" className="flex items-center gap-2">
                      <label htmlFor="assignee" className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        Assignee
                      </label>
                      <div className="relative">
                        <select
                          id="assignee"
                          name="assignUserId"
                          defaultValue={activeThread.assignedToUserId ?? ""}
                          className="appearance-none rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3 py-2 pr-9 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Unassigned</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name ?? user.email}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
                      >
                        Save
                      </button>
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post">
                      {activeThread.assignedToUserId === session.user?.id ? (
                        <input type="hidden" name="assign" value="none" />
                      ) : (
                        <input type="hidden" name="assign" value="me" />
                      )}
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
                      >
                        {activeThread.assignedToUserId === session.user?.id ? "Unassign" : "Assign to me"}
                      </button>
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post">
                      <input type="hidden" name="status" value={ThreadStatus.RESOLVED} />
                      <input type="hidden" name="clearUnread" value="true" />
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700 shadow-sm transition hover:-translate-y-[1px] hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        Close thread
                      </button>
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post">
                      <input type="hidden" name="status" value={ThreadStatus.AWAITING_RESIDENT} />
                      <button
                        type="submit"
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 shadow-sm transition hover:-translate-y-[1px] hover:border-amber-300 hover:bg-amber-100"
                      >
                        Waiting on resident
                      </button>
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post">
                      <input type="hidden" name="status" value={ThreadStatus.FOLLOW_UP} />
                      <input type="hidden" name="assign" value="me" />
                      {(activeThread.category ?? "").toLowerCase().includes("marketing") ? (
                        <>
                          <input type="hidden" name="clearUnread" value="true" />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-400 hover:bg-slate-100"
                          >
                            Archive / Ignore
                          </button>
                        </>
                      ) : (
                        <button
                          type="submit"
                          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-700 shadow-sm transition hover:-translate-y-[1px] hover:border-violet-300 hover:bg-violet-100"
                        >
                          Wait on HOA
                        </button>
                      )}
                    </form>
                    <form action={`/api/threads/${activeThread.id}`} method="post">
                      <input type="hidden" name="clearUnread" value="true" />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-100"
                      >
                        Mark all read
                      </button>
                    </form>
                  </div>
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
                          <p className="text-xs text-slate-400">{message.receivedAt.toLocaleString()}</p>
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
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-blue-300"
                                >
                                  Regenerate
                                </button>
                              </form>
                              {message.aiReply.error ? (
                                <form action={`/api/messages/${message.id}/retry-draft?variant=regenerate`} method="post">
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                                  >
                                    Retry
                                  </button>
                                </form>
                              ) : null}
                              {!message.aiReply.sent ? (
                                <form action={`/api/messages/${message.id}/send`} method="post">
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-500"
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
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-slate-900"
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
        <div className="fixed bottom-4 right-4 z-50 w-[clamp(420px,48vw,900px)] max-w-[92vw] rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <details open className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-0.5 text-slate-800 transition hover:text-slate-900">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Decision panel</p>
                <p className="truncate text-sm font-semibold text-slate-900" title={activeThread.subject}>
                  {activeThread.subject}
                </p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 group-open:rotate-0 group-open:translate-y-0">
                {latestAiReply.aiReply.sent ? "Sent" : "Draft"}
              </span>
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
                  <div className="mt-1 flex flex-wrap gap-2">
                    <form action={`/api/messages/${latestAiReply.id}/send`} method="post">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                      >
                        Send
                      </button>
                    </form>
                    <a
                      href={`/app/hoa/${resolvedParams.hoaId}/inbox?thread=${activeThread.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300"
                    >
                      Edit
                    </a>
                    <a
                      href={`#message-${latestAiReply.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300"
                    >
                      Dismiss
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">Suggested reply</span>
                  <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">Auto-draft</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={`/api/messages/${latestAiReply.id}/retry-draft?variant=regenerate`} method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:border-blue-300 hover:text-slate-900"
                    >
                      Regenerate
                    </button>
                  </form>
                  {!latestAiReply.aiReply.sent ? (
                    <form action={`/api/messages/${latestAiReply.id}/send`} method="post">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                      >
                        Send
                      </button>
                    </form>
                  ) : null}
                  <form action={`/api/messages/${latestAiReply.id}/retry-draft?variant=regenerate`} method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
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
