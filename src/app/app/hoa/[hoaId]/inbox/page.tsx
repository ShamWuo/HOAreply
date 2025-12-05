import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { MessageDirection } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { pillButtonClasses } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

interface InboxPageProps {
  params: Promise<{ hoaId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchThreads(hoaId: string) {
  return prisma.emailThread.findMany({
    where: { hoaId },
    include: {
      messages: {
        orderBy: { receivedAt: "asc" },
        include: {
          aiReply: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  await assertHoaOwnership(resolvedParams.hoaId, session.user.id);
  const threads = await fetchThreads(resolvedParams.hoaId);
  const requestedThreadId = typeof resolvedSearchParams?.thread === "string" ? resolvedSearchParams.thread : undefined;
  const activeThread = threads.find((thread) => thread.id === requestedThreadId) ?? threads[0];
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
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Threads</p>
                <p className="text-sm text-slate-500">{threads.length} conversations</p>
              </div>
              <Link href="/app/dashboard" className={pillButtonClasses({ variant: "secondary", size: "sm" })}>
                Dashboard
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {threads.map((thread) => {
                const lastMessage = thread.messages.at(-1);
                const badge = (() => {
                  if (!lastMessage?.aiReply) return "";
                  if (lastMessage.aiReply.error) return "Error";
                  if (!lastMessage.aiReply.sent) return "Pending";
                  return "Sent";
                })();
                const isActive = activeThread && thread.id === activeThread.id;

                return (
                  <Link
                    key={thread.id}
                    href={`/app/hoa/${resolvedParams.hoaId}/inbox?thread=${thread.id}`}
                    scroll={false}
                    className={cn(
                      "block w-full rounded-[26px] border px-4 py-4 text-left text-sm transition",
                      isActive
                        ? "border-slate-800 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)]"
                        : "border-slate-100 bg-white/80 text-slate-600 hover:border-blue-200 hover:bg-white",
                    )}
                  >
                    <p className={cn("text-base font-semibold", isActive ? "text-white" : "text-slate-900")}>{thread.subject}</p>
                    {lastMessage ? (
                      <p className={isActive ? "text-xs text-white/70" : "text-xs text-slate-400"}>
                        {lastMessage.direction === MessageDirection.INCOMING ? lastMessage.from : lastMessage.to}
                      </p>
                    ) : null}
                    {badge ? (
                      <span
                        className={cn(
                          "mt-3 inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em]",
                          lastMessage?.aiReply?.error
                            ? "bg-red-500/20 text-red-100"
                            : isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-900/80 text-white",
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </GlassPanel>
        </aside>

        <main className="flex-1">
          <GlassPanel className="h-full p-6">
            {success ? (
              <div className="mb-4 rounded-[26px] border border-emerald-200/60 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
                Gmail connected successfully.
              </div>
            ) : null}
            {errorMsg ? (
              <div className="mb-4 rounded-[26px] border border-red-200/60 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            {!activeThread ? (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-sm text-slate-500">
                No messages yet. Emails will show up here after the next Gmail poll.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Subject</p>
                  <h1 className="text-3xl font-semibold text-slate-900">{activeThread.subject}</h1>
                </div>
                <div className="space-y-5">
                  {activeThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-[30px] border border-slate-100 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
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
                      <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{message.bodyText}</p>
                      {message.aiReply ? (
                        <div
                          className={cn(
                            "mt-4 rounded-[24px] border px-4 py-3 text-sm",
                            message.aiReply.error
                              ? "border-red-300 bg-red-50/90 text-red-900"
                              : "border-blue-100 bg-blue-50/80 text-slate-700",
                          )}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-semibold">
                              AI Reply
                              {message.aiReply.sent ? " • Sent" : message.aiReply.error ? " • Error" : " • Pending"}
                            </p>
                            {message.aiReply.error ? (
                              <form action={`/api/messages/${message.id}/retry-draft`} method="post">
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                                >
                                  Retry draft
                                </button>
                              </form>
                            ) : null}
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm">
                            {message.aiReply.replyText || "No draft"}
                          </p>
                          {message.aiReply.error ? (
                            <p className="mt-2 text-sm font-semibold text-red-800">{message.aiReply.error}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                  Manual compose coming soon.
                </div>
              </div>
            )}
          </GlassPanel>
        </main>
      </div>
    </div>
  );
}
