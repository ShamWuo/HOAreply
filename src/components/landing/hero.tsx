import Link from "next/link";

const schedulingLink = "https://cal.com/hoareply/intro";

export function LandingHero() {
  return (
    <section
      id="hero"
      className="hero-animated relative overflow-hidden rounded-[32px] border border-white/60 px-6 py-16 shadow-[0_45px_120px_rgba(15,23,42,0.12)] sm:px-14"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_55%)]" />
      <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8 animate-fade-up">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Stop drowning in HOA emails without hiring staff.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              AI drafts replies, flags urgent issues, and keeps Gmail as your source of truth. Residents get answers. Boards calm down. You get your evenings back.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-800">40–60% faster replies (143 emails, Colorado pilot, week 1).</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(37,99,235,0.35)] transition hover:from-blue-500 hover:to-blue-500"
            >
              Start free (no card)
            </Link>
            <Link
              href={schedulingLink}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-7 py-3 text-sm font-semibold text-slate-900 transition hover:border-blue-200"
            >
              Book 15-min intro
            </Link>
          </div>
          <div className="text-sm text-slate-600">No credit card • Secure Google OAuth • 10-minute setup</div>
          {/* Removed decorative pilot stats and startup-y copy for clarity and professionalism */}
        </div>
        <div className="relative animate-slide-in animate-delay-1">
          <div className="rounded-[28px] card-dark p-1 text-white card-tilt">
            <div className="rounded-[24px] bg-gradient-to-br from-[#1d2f4f]/90 via-[#131c34]/95 to-[#0f1c33] p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-blue-200/80">Inbox overview</p>
              <div className="mt-4 space-y-4">
                {["Northshore HOA", "Harbor Point", "Grand Oaks", "Sunset Villas"].map((hoa, index) => (
                  <div
                    key={hoa}
                    className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-5 py-4 shadow-[0_25px_60px_rgba(9,12,26,0.45)]"
                  >
                    <div className="flex items-center justify-between text-sm text-blue-50">
                      <p className="font-semibold">{hoa}</p>
                      <span className="text-xs text-emerald-300/90">{index === 0 ? "Live" : "Sync"}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-blue-100/80">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-blue-200/60">Unread</p>
                        <p className="text-base text-white">{6 - index}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-blue-200/60">AI drafts</p>
                        <p className="text-base text-white">{index + 1}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-[0.4em] text-blue-200/60">SLA</p>
                        <div className="mt-2 h-2 rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{ width: `${70 + index * 6}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 hidden rounded-2xl border border-white/30 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-[0_25px_60px_rgba(15,23,42,0.18)] md:block animate-fade-in animate-delay-2">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workflow</p>
            <p className="mt-2 font-semibold text-slate-900">Gmail + Request Engine</p>
            <p className="text-xs text-slate-500">Under 90 seconds</p>
          </div>
        </div>
      </div>
    </section>
  );
}
