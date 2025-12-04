import Link from "next/link";

export function LandingHero() {
  return (
    <section id="hero" className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/90 px-6 py-16 shadow-[0_45px_120px_rgba(15,23,42,0.12)] sm:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_55%)]" />
      <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-700">
            Built for busy HOA boards
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              AI Inbox Assistant for HOA managers
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Connect Gmail. AI reads, sorts, and drafts replies to resident emails instantly. Boards approve with a click, and Gmail stays the source of truth.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(37,99,235,0.35)] transition hover:bg-blue-500"
            >
              Start free trial
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-7 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300"
            >
              Book a demo
            </Link>
          </div>
          <div className="text-sm text-slate-600">
            Trusted by community managers across the US · 14-day guarantee · No credit card required
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { label: "Replies drafted", value: "Most emails" },
              { label: "Reduction in inbox time", value: "Up to 50%" },
              { label: "Setup time", value: "< 10 minutes" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/70 bg-slate-50/60 px-4 py-3 text-center">
                <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[28px] border border-slate-100 bg-slate-900 p-1 text-white shadow-[0_30px_80px_rgba(15,23,42,0.45)]">
            <div className="rounded-[24px] bg-slate-950 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Inbox Overview</p>
              <div className="mt-4 space-y-4">
                {["Northshore HOA", "Harbor Point", "Grand Oaks", "Sunset Villas"].map((hoa, index) => (
                  <div key={hoa} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-semibold">{hoa}</p>
                      <span className="text-xs text-blue-300">{index === 0 ? "Live" : "Sync"}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Unread</p>
                        <p className="text-base text-white">{6 - index}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">AI drafts</p>
                        <p className="text-base text-white">{index + 1}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">SLA</p>
                        <div className="mt-2 h-2 rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${70 + index * 6}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 hidden rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_25px_60px_rgba(15,23,42,0.18)] md:block">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workflow</p>
            <p className="mt-2 font-semibold text-slate-900">Gmail → n8n → AI reply</p>
            <p className="text-xs text-slate-500">Under 90 seconds</p>
          </div>
        </div>
      </div>
    </section>
  );
}
