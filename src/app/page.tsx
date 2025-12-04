import { LandingHero } from "@/components/landing/hero";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50/50 to-white px-4 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.6em] text-slate-500">BoardInbox AI</p>
          <Link href="/auth/login" className="text-sm font-semibold text-blue-600">
            Sign in
          </Link>
        </header>
        <LandingHero />
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Secure Google OAuth",
              copy: "Each HOA gets its own Gmail connection with offline tokens stored in Postgres.",
            },
            {
              title: "n8n-native",
              copy: "Send normalized messages to your n8n webhook and receive AI replies instantly.",
            },
            {
              title: "Unified inbox",
              copy: "Monitor threads, pending drafts, and delivery errors inside a clean dashboard.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{feature.title}</p>
              <p className="mt-2 text-base text-slate-700">{feature.copy}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
