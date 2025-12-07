import Link from "next/link";
import { auth } from "@/lib/auth";
import { listUserHoas, HoaWithRelations } from "@/lib/hoa";
import { CreateHoaForm } from "@/components/hoa/create-hoa-form";
import { SignOutButton } from "@/components/auth/signout-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { HoaCardControls } from "@/components/hoa/hoa-card-controls";

function clamp(text: string | null | undefined, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoas: HoaWithRelations[] = await listUserHoas(session.user.id);
  const connectedCount = hoas.filter((hoa) => Boolean(hoa.gmailAccount)).length;
  const pendingCount = Math.max(hoas.length - connectedCount, 0);
  const stats = [
    {
      label: "Total HOAs",
      value: hoas.length,
      helper: "Boards onboarded",
    },
    {
      label: "Gmail live",
      value: connectedCount,
      helper: "Ready to send",
    },
    {
      label: "Awaiting connect",
      value: pendingCount,
      helper: "Connect Gmail now",
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_50%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-12 md:px-6">
        <GlassPanel className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Operator console</p>
              <h1 className="text-4xl font-semibold text-slate-900">
                Welcome back, {session.user.name ?? session.user.email}
              </h1>
              <p className="text-base text-slate-700">Connect. Review. Send. Fix issues fast.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/app/polls"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm transition hover:border-blue-200"
              >
                Poll history
              </Link>
              <SignOutButton />
            </div>
          </div>
          {pendingCount > 0 ? (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold">{pendingCount} inbox{pendingCount > 1 ? "es" : ""} idle — connect Gmail to activate AI replies.</p>
                  <p className="text-[13px] text-amber-800">Finish setup to start drafting and sending automatically.</p>
                </div>
                <Link
                  href={`/connect/gmail${hoas.find((h) => !h.gmailAccount) ? `?hoaId=${hoas.find((h) => !h.gmailAccount)?.id}` : ""}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.25em] text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                >
                  Finish connecting →
                </Link>
              </div>
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <GlassPanel
                key={stat.label}
                variant="frosted"
                className="flex min-h-[140px] flex-col justify-between px-5 py-5 text-slate-700"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{stat.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.helper}</p>
              </GlassPanel>
            ))}
          </div>
        </GlassPanel>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Your HOAs</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Live Gmail Connections</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
                  {hoas.length} total
                </span>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {hoas.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                  No HOAs yet. Create one and connect Gmail to start syncing conversations.
                </div>
              ) : (
                hoas.map((hoa) => (
                  <div
                    key={hoa.id}
                    className="flex flex-col gap-3 rounded-[28px] border border-slate-100 bg-white/90 p-5 text-sm text-slate-600 shadow-[0_15px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">{hoa.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.3em] ${
                            hoa.gmailAccount ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {hoa.gmailAccount ? "Gmail connected" : "Needs connect"}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                          ID {hoa.id.slice(0, 6)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {hoa.gmailAccount ? (
                          hoa.gmailAccount.lastPollError ? (
                            <span
                              className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-100"
                              title={hoa.gmailAccount.lastPollError}
                            >
                              Poll error: {clamp(hoa.gmailAccount.lastPollError, 80)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              {hoa.gmailAccount.lastPolledAt
                                ? `Last polled ${new Date(hoa.gmailAccount.lastPolledAt).toLocaleString()}`
                                : "Not yet polled"}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700">
                            Connect Gmail to start sync
                          </span>
                        )}
                      </div>
                    </div>
                    {hoa.gmailAccount ? (
                      <>
                        {hoa.gmailAccount.lastPollError ? (
                          <Link
                            href={`/connect/gmail?hoaId=${hoa.id}`}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300"
                          >
                            Reconnect
                          </Link>
                        ) : null}
                        <HoaCardControls
                          hoaId={hoa.id}
                          initialName={hoa.name}
                          detailsUrl={`/app/hoa/${hoa.id}`}
                          inboxUrl={`/app/hoa/${hoa.id}/inbox`}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 sm:items-end sm:text-right">
                        <Link
                          href={`/connect/gmail?hoaId=${hoa.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.25em] text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-500"
                        >
                          Connect Gmail
                        </Link>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Inbox locked until connected</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="flex flex-col gap-5 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Create new HOA</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Launch an AI inbox in 3 steps</h3>
              <p className="mt-1 text-sm text-slate-700">Name it, connect Gmail, turn on replies. No fluff.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Playbook</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>1. Name the HOA and invite operators.</li>
                <li>2. Connect Gmail via OAuth.</li>
                <li>3. Let the built-in request engine classify, route, and draft.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <CreateHoaForm />
            </div>
          </GlassPanel>
        </section>
      </div>
    </div>
  );
}
