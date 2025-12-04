import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/80 px-6 py-16 shadow-[0_30px_70px_rgba(15,23,42,0.08)] sm:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.6em] text-slate-500">BoardInbox AI Connect</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          Bring HOA Gmail inboxes into one AI-assisted workspace
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Connect Gmail with a few clicks, route messages to your n8n workflow, and send AI-crafted replies without leaving
          this dashboard.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="w-full rounded-full bg-blue-600 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition hover:bg-blue-500 sm:w-auto"
          >
            Get started
          </Link>
          <Link
            href="/auth/login"
            className="w-full rounded-full border border-slate-300 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:border-slate-400 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-8 bottom-6 hidden h-32 rounded-3xl border border-slate-100 bg-gradient-to-b from-blue-50/20 to-blue-100/40 blur-3xl sm:block" />
    </section>
  );
}
