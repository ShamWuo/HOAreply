import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.14),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.1),transparent_35%)]" />
      <div className="relative flex min-h-screen flex-col">
        <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-20 pt-12 md:grid-cols-[1.1fr_0.9fr] md:px-6">
          <section className="hidden rounded-[40px] border border-white/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-[0_45px_140px_rgba(15,23,42,0.45)] md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Ops leaders</p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight">
                Concierge onboarding for boards and property managers
              </h2>
              <p className="mt-4 text-base text-white/80">
                Provision Gmail, sync CC&amp;Rs into AI copilots, and ship a branded inbox without writing custom code.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                {
                  label: "Launch time",
                  stat: "< 1 hr",
                  subcopy: "Average go-live for a new HOA",
                },
                {
                  label: "Resident CSAT",
                  stat: "98%",
                  subcopy: "After AI-assisted replies",
                },
                {
                  label: "Workflow ready",
                  stat: "n8n",
                  subcopy: "Native webhook bridge",
                },
                {
                  label: "Security",
                  stat: "SOC2",
                  subcopy: "Audit-friendly logging",
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/20 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{metric.stat}</p>
                  <p className="text-sm text-white/70">{metric.subcopy}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
            <div className="mb-8 space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">HOA Reply AI Connect</p>
              <h1 className="text-3xl font-semibold text-slate-900">Authenticate your workspace</h1>
              <p className="text-sm text-slate-500">Secure Gmail and n8n automation bridge for HOA boards.</p>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
