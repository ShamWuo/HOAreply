import { LandingHero } from "@/components/landing/hero";
import { LandingNavbar } from "@/components/landing/navbar";
import Link from "next/link";

const pains = [
  "Too many resident emails every day",
  "Slow reply times cause conflict",
  "Board members complain about response delays",
  "Managers drowning in repetitive questions",
  "Hard to stay organized across communities",
  "Angry residents escalate small issues",
];

const features = [
  { title: "AI classifies every email", copy: "Maintenance, violations, billing, general, spam—sorted automatically.", accent: "Classification" },
  { title: "AI drafts professional replies", copy: "Legal-safe tone based on your HOA docs. Boards edit or approve in one click.", accent: "Reply drafts" },
  { title: "Priority detection", copy: "Maintenance = high, violations = urgent, spam = low. Focus on what matters first.", accent: "Priorities" },
  { title: "Attachment handling", copy: "Flags when residents mention photos or files so you can request or find them fast.", accent: "Attachments" },
  { title: "Google Sheets logging", copy: "Every classified email and action logged automatically for your records.", accent: "Records" },
  { title: "One-click sending", copy: "Approve and send without leaving your flow. Gmail stays the source of truth.", accent: "Speed" },
];

const howItWorks = [
  { step: "Connect Gmail", detail: "Secure OAuth, no passwords stored." },
  { step: "Let emails flow", detail: "AI reads, sorts, and drafts replies instantly." },
  { step: "Approve & send", detail: "Review drafts, one-click send, all logged." },
];

const screenshots = [
  "Dashboard overview",
  "Email classification",
  "AI reply draft",
  "Google Sheets log",
  "Gmail connection flow",
];

const pricingPlans = [
  {
    name: "HOA Manager",
    price: "$59",
    descriptor: "per month · $199 setup",
    features: ["AI inbox assistant", "Automatic classifications", "Reply drafts", "Google Sheets logs", "Unlimited emails"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Management Company",
    price: "Custom",
    descriptor: "per manager or per community",
    features: ["Volume pricing", "Dedicated support", "Priority onboarding"],
    cta: "Talk to sales",
  },
];

const faq = [
  { q: "Does the AI send emails automatically?", a: "You choose. By default drafts wait for approval; auto-send can be enabled per inbox." },
  { q: "What if AI makes a mistake?", a: "You review drafts before sending. Edits are logged, and Gmail remains the source of truth." },
  { q: "Will residents know it's AI?", a: "No. Emails come from your Gmail with your branding and tone." },
  { q: "How long does setup take?", a: "About 10 minutes to connect Gmail and start classifying." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel anytime; no long-term contracts." },
  { q: "Is this allowed by my board?", a: "Yes—boards approve drafts and keep oversight. Nothing goes out without your control." },
];

const caseStudy = {
  title: "143 emails handled in 7 days",
  bullets: [
    "Cut manual inbox time by 42%",
    "Replies became consistent and professional",
    "Zero resident complaints about response time",
  ],
};

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <LandingNavbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-20 pt-16 md:px-6">
        <LandingHero />

        <section className="grid gap-6 md:grid-cols-2" id="pains">
          <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Pain points</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">We know where it hurts</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {pains.map((pain) => (
                <li key={pain} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <span>{pain}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">How it works</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">3 steps, no extra tools</h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              {howItWorks.map((item, idx) => (
                <li key={item.step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{item.step}</p>
                    <p className="text-slate-600">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/95 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{feature.accent}</p>
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.copy}</p>
            </div>
          ))}
        </section>

        <section id="screenshots" className="space-y-6 rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Screenshots</p>
              <h3 className="text-2xl font-semibold text-slate-900">See it before you try it</h3>
            </div>
            <Link href="/auth/login" className="text-sm font-semibold text-blue-600">
              View demo
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {screenshots.map((shot) => (
              <div key={shot} className="aspect-video rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                <div className="flex h-full items-center justify-center">Add {shot} mockup</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6" id="case-study">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Case study</p>
          <div className="rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <h3 className="text-2xl font-semibold text-slate-900">{caseStudy.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {caseStudy.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-8" id="pricing">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Pricing</p>
            <h3 className="text-3xl font-semibold text-slate-900">Simple plans</h3>
            <p className="text-sm text-slate-600">Setup included. Cancel anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] ${plan.featured ? "ring-2 ring-blue-500" : ""}`}
              >
                {plan.featured ? (
                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Most chosen</span>
                ) : null}
                <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
                <div className="text-4xl font-semibold text-slate-900">{plan.price}</div>
                <p className="text-sm text-slate-500">{plan.descriptor}</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-blue-600 text-white shadow-[0_20px_40px_rgba(37,99,235,0.35)] hover:bg-blue-500"
                      : "border border-slate-200 text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6" id="faq">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">FAQ</p>
          <div className="grid gap-4 md:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                <p className="text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]" id="security">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Security & compliance</p>
          <h3 className="text-2xl font-semibold text-slate-900">Enterprise-ready from day one</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>OAuth 2.0 Google connection; we never store passwords</li>
            <li>Data encrypted in transit and at rest</li>
            <li>Access controls per HOA; audit trails for approvals</li>
            <li>Data retention: configurable; data deletion on request</li>
            <li>AI processes emails for classification and drafts only</li>
            <li>Privacy policy and terms available on request</li>
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/login" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">
              Book a security review
            </Link>
            <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300">
              Start free trial
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/60 bg-gradient-to-br from-blue-600 to-slate-900 p-10 text-white shadow-[0_40px_90px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Ready?</p>
              <h3 className="mt-3 text-3xl font-semibold">Give your board a concierge-grade inbox</h3>
              <p className="mt-2 text-sm text-white/80">Connect Gmail, let AI sort and draft, and keep every approval auditable.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900">
                Start free trial
              </Link>
              <Link href="mailto:hello@boardinbox.ai" className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-sm font-semibold">
                Contact sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/90">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm text-slate-600 md:grid-cols-4 md:px-6">
          <div>
            <p className="text-lg font-semibold text-slate-900">BoardInbox AI</p>
            <p className="mt-2 text-sm">AI inbox assistant for HOA managers and boards.</p>
            <p className="mt-2 text-xs text-slate-500">Powered by BoardInbox</p>
          </div>
          {[
            {
              title: "Product",
              links: ["Features", "How it works", "Pricing", "Security"],
            },
            {
              title: "Company",
              links: ["Contact", "Support", "Status"],
            },
            {
              title: "Legal",
              links: ["Privacy", "Terms", "Data deletion"],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-slate-900">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/80 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} BoardInbox AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
