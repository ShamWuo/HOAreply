import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassPanel } from "@/components/ui/glass-panel";
import { pillButtonClasses } from "@/components/ui/pill-button";

function badge(status: string) {
  if (status === "success") return "bg-emerald-100 text-emerald-800";
  if (status === "error") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default async function PollsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const runs = await prisma.pollRun.findMany({
    where: {
      gmailAccount: {
        hoa: { userId: session.user.id },
      },
    },
    include: {
      gmailAccount: {
        select: {
          id: true,
          email: true,
          hoaId: true,
          hoa: { select: { name: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-12 md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Poll history</p>
            <h1 className="text-3xl font-semibold text-slate-900">Gmail poll runs</h1>
            <p className="text-sm text-slate-600">Latest 50 runs across your HOAs.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/app/dashboard" className={pillButtonClasses({ variant: "secondary" })}>
              Dashboard
            </Link>
          </div>
        </div>

        <GlassPanel className="p-6">
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No polls yet.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Completed</th>
                    <th className="px-3 py-2">HOA</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Processed</th>
                    <th className="px-3 py-2">Error</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{new Date(run.startedAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {run.completedAt ? new Date(run.completedAt).toLocaleString() : "In progress"}
                      </td>
                      <td className="px-3 py-2 text-slate-800">{run.gmailAccount?.hoa?.name ?? "HOA"}</td>
                      <td className="px-3 py-2 text-slate-600">{run.gmailAccount?.email}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${badge(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800">{run.processedCount}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={run.error ?? ""}>
                        {run.error ?? ""}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <form action={`/api/hoas/${run.gmailAccount?.hoaId}/poll`} method="post">
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 transition hover:border-blue-200"
                            >
                              Retry
                            </button>
                          </form>
                          <Link
                            href={`/app/hoa/${run.gmailAccount?.hoaId}/inbox`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700 transition hover:border-blue-200"
                          >
                            Inbox
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
