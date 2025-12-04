import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { MessageDirection } from "@prisma/client";

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
  const activeThread = threads[0];
  const success = Boolean(resolvedSearchParams?.success);
  const errorMsg = resolvedSearchParams?.message;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="w-full border-b border-slate-200 bg-white/80 p-6 lg:w-80 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Threads</p>
            <p className="text-sm text-slate-500">{threads.length} conversations</p>
          </div>
          <Link href="/app/dashboard" className="text-xs text-blue-600">
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

            return (
              <button
                key={thread.id}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left text-sm text-slate-600 transition hover:border-blue-200 hover:bg-white/90"
              >
                <p className="text-base font-semibold text-slate-900">{thread.subject}</p>
                {lastMessage ? (
                  <p className="text-xs text-slate-400">
                    {lastMessage.direction === MessageDirection.INCOMING ? lastMessage.from : lastMessage.to}
                  </p>
                ) : null}
                {badge ? (
                  <span className="mt-2 inline-flex items-center rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>
      <main className="flex-1 bg-slate-50/70 p-6">
        {success ? (
          <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            Gmail connected successfully.
          </div>
        ) : null}
        {errorMsg ? (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}
        {!activeThread ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
            No messages yet. Emails will show up here after the next Gmail poll.
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Subject</p>
              <h1 className="text-2xl font-semibold text-slate-900">{activeThread.subject}</h1>
            </div>
            <div className="space-y-4">
              {activeThread.messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      {message.direction === MessageDirection.INCOMING ? message.from : message.to}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {message.direction === MessageDirection.INCOMING ? "Incoming" : "Outgoing"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{message.bodyText}</p>
                  {message.aiReply ? (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-blue-900">AI Reply</p>
                      <p className="mt-1 whitespace-pre-line">{message.aiReply.replyText || "No draft"}</p>
                      <div className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-500">
                        {message.aiReply.error
                          ? `Error: ${message.aiReply.error}`
                          : message.aiReply.sent
                            ? "Sent"
                            : "Pending send"}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
              Manual compose coming soon.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
