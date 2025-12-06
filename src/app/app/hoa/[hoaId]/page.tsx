import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertHoaOwnership } from "@/lib/hoa";
import { GlassPanel } from "@/components/ui/glass-panel";
import { pillButtonClasses } from "@/components/ui/pill-button";

function clamp(text: string | null | undefined, max = 140) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface HoaDetailPageProps {
  params: Promise<{ hoaId: string }>;
}

export default async function HoaDetailPage({ params }: HoaDetailPageProps) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoa = await assertHoaOwnership(hoaId, session.user.id);
  const pollRuns = hoa.gmailAccount
    ? await prisma.pollRun.findMany({
        where: { gmailAccountId: hoa.gmailAccount.id },
        orderBy: { startedAt: "desc" },
        take: 5,
      })
    : [];
  const status = hoa.gmailAccount
    ? {
        label: "Gmail connected",
        badgeClass: "bg-emerald-100 text-emerald-700",
        helper: `Email: ${hoa.gmailAccount.email}`,
      }
    : {
        label: "Connection pending",
        badgeClass: "bg-amber-100 text-amber-800",
        helper: "Authorize Gmail to enable AI replies.",
      };

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-12 md:px-6">
        <Link
          href="/app/dashboard"
          className={pillButtonClasses({ variant: "secondary", className: "w-fit bg-white/80" })}
        >
          ← Dashboard
        </Link>
        <GlassPanel className="p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">HOA workspace</p>
              <h1 className="text-4xl font-semibold text-slate-900">{hoa.name}</h1>
              <p className="text-sm text-slate-500">Created {hoa.createdAt.toLocaleDateString()}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${status.badgeClass}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <GlassPanel variant="frosted" className="p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workspace ID</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{hoa.id}</p>
              <p className="text-sm text-slate-500">Store this when generating automation rules.</p>
            </GlassPanel>
            <GlassPanel variant="frosted" className="p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Gmail status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{status.label}</p>
              <p className="text-sm text-slate-500">{status.helper}</p>
              {hoa.gmailAccount ? (
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Sync health</p>
                  {hoa.gmailAccount.lastPollError ? (
                    <p
                      className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                      title={hoa.gmailAccount.lastPollError}
                    >
                      Poll error: {clamp(hoa.gmailAccount.lastPollError, 120)}
                    </p>
                  ) : (
                    <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      {hoa.gmailAccount.lastPolledAt
                        ? `Last polled ${hoa.gmailAccount.lastPolledAt.toLocaleString()}`
                        : "Not yet polled"}
                    </p>
                  )}
                  {hoa.gmailAccount.lastPollError ? (
                    <a
                      href={`/connect/gmail?hoaId=${hoa.id}`}
                      className="inline-flex w-fit items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300"
                    >
                      Reconnect Gmail
                    </a>
                  ) : null}
                  {pollRuns.length ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3">
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
                              className="flex items-start justify-between rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                                  <span className="max-w-[14rem] truncate text-[11px] font-semibold text-red-700" title={run.error}>
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
                </div>
              ) : null}
            </GlassPanel>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`/connect/gmail?hoaId=${hoa.id}`}
              className={pillButtonClasses({ variant: "primary" })}
            >
              {hoa.gmailAccount ? "Reconnect Gmail" : "Connect Gmail"}
            </a>
            <Link
              href={`/app/hoa/${hoa.id}/inbox`}
              className={pillButtonClasses({ variant: "secondary" })}
            >
              View inbox
            </Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
