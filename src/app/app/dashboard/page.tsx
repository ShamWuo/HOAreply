import { auth } from "@/lib/auth";
import { listUserHoas } from "@/lib/hoa";
import { CreateHoaForm } from "@/components/hoa/create-hoa-form";
import { SignOutButton } from "@/components/auth/signout-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { HoaCardControls } from "@/components/hoa/hoa-card-controls";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoas = await listUserHoas(session.user.id);
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
      helper: "Ready for AI replies",
    },
    {
      label: "Awaiting connect",
      value: pendingCount,
      helper: "Needs OAuth",
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
              <p className="text-base text-slate-500">
                Monitor AI replies, Gmail health, and HOAs from one premium workspace.
              </p>
            </div>
            <SignOutButton />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <GlassPanel key={stat.label} variant="frosted" className="px-5 py-6 text-slate-700">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.helper}</p>
              </GlassPanel>
            ))}
          </div>
        </GlassPanel>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Your HOAs</p>
                <h2 className="text-2xl font-semibold text-slate-900">Realtime Gmail sync</h2>
              </div>
              <span className="rounded-full bg-slate-900/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                {hoas.length} total
              </span>
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
                    className="flex flex-col gap-4 rounded-[28px] border border-slate-100 bg-white/90 p-5 text-sm text-slate-600 shadow-[0_15px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{hoa.name}</p>
                      <div className="mt-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em]">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                            hoa.gmailAccount ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {hoa.gmailAccount ? "Gmail connected" : "Needs connect"}
                        </span>
                        <span className="text-slate-400">ID {hoa.id.slice(0, 6)}</span>
                      </div>
                    </div>
                    <HoaCardControls
                      hoaId={hoa.id}
                      initialName={hoa.name}
                      detailsUrl={`/app/hoa/${hoa.id}`}
                      inboxUrl={`/app/hoa/${hoa.id}/inbox`}
                    />
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="flex flex-col gap-5 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Create new HOA</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Launch an AI inbox in 3 steps</h3>
              <p className="mt-1 text-sm text-slate-600">
                Provision Gmail, sync your CC&Rs into the copilots, and keep your n8n flows notified.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Playbook</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>1. Name the HOA and invite operators.</li>
                <li>2. Connect Gmail via OAuth.</li>
                <li>3. Pipe threads into your n8n webhook.</li>
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
