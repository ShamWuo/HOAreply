import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { LandingHero } from "@/components/landing/hero";
import { buildMetadata } from "@/lib/seo";

export const generateMetadata = () =>
  buildMetadata({
    title: "HOA Reply AI | Automate HOA inbox triage with Gmail in minutes",
    description:
      "Connect Gmail, let AI classify and draft replies, and approve with one click. Built for HOA managers and boards who need faster responses.",
    canonicalPath: "/",
  });
const siteUrl = "https://hoareply.com";
const privacyUrl = `${siteUrl}/privacy`;
const termsUrl = `${siteUrl}/terms`;

const pains = [
  "Residents ask the same questions over and over",
  "Angry follow-ups escalate simple issues",
  "Board members demand faster turnaround times",
  "Managers juggle multiple communities with no central workflow",
  "Important threads get buried in busy inboxes",
  "Inconsistent replies increase perceived legal risk",
];

const features = [
  {
    title: "Classification",
    copy: "Reads the subject and body to assign each email to maintenance, violations, billing, general questions, spam, or other.",
    accent: "Classification",
  },
  {
    title: "Reply drafts",
    copy: "Generates clean, professional replies based on your HOA's rules and tone, ready for quick review and send.",
    accent: "Reply drafts",
  },
  {
    title: "Priorities",
    copy: "Flags urgent violation and maintenance items first so you don't waste time on low-value spam and general questions.",
    accent: "Priorities",
  },
  {
    title: "Attachments",
    copy: "Detects when residents mention photos, forms, or files so you can request or locate them without hunting.",
    accent: "Attachments",
  },
  {
    title: "Records",
    copy: "Logs the classification, priority, draft, and outcome for every email in Google Sheets for audits and board reporting.",
    accent: "Records",
  },
  {
    title: "Speed",
    copy: "Approve and send directly from your workflow while Gmail remains the source of truth.",
    accent: "Speed",
  },
];

const howItWorks = [
  { step: "Connect Gmail (secure OAuth)", detail: "No passwords, no IMAP settings, no IT tickets. Sign in with Google and you're connected." },
  { step: "AI reads and sorts every email", detail: "Each message is classified into: maintenance, violations, billing, general questions, spam, or other—automatically." },
  {
    step: "Approve, send, and log",
    detail: "You review the draft reply, approve with one click, and every action is logged to Google Sheets for records and board oversight.",
  },
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
    descriptor: "per month • $199 setup",
    features: [
      "AI inbox assistant for one manager",
      "Automatic classifications and reply drafts",
      "Google Sheets audit log setup included",
      "Unlimited emails and drafts",
      "Private workflow per manager",
      "30-minute onboarding call",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Management Company",
    price: "Custom",
    descriptor: "per manager or per community",
    features: [
      "Volume pricing for multiple managers or communities",
      "Multi-inbox setup and approvals",
      "Dedicated support and priority onboarding",
      "Custom reporting and integrations",
    ],
    cta: "Talk to sales",
  },
];

const faq = [
  { q: "Does the AI send emails automatically?", a: "By default, drafts wait for your approval. If you prefer, auto-send can be enabled per inbox once you're comfortable." },
  { q: "What if the AI makes a mistake?", a: "You can edit any draft before sending. Those edits help refine future replies." },
  { q: "Will residents know it's AI?", a: "No. Emails are sent from your Gmail account, with your name and branding." },
  { q: "How long does setup take?", a: "Most managers are fully connected and receiving drafts within about 10 minutes." },
  { q: "Is this allowed by my board?", a: "Yes. Boards keep oversight, since replies are reviewed and approved before sending and every action is logged." },
];

const caseStudy = {
  title: "143 emails handled in 7 days",
  subtitle: "Community manager, Colorado",
  bullets: [
    "Cut inbox time by 42% in the first week",
    "Reduced angry follow-ups by 36%",
    "Reply tone became consistent across the board",
    "Manager took on 2 extra communities with no overtime",
    "Zero resident complaints about response time during the pilot",
  ],
};

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-20 pt-16 md:px-6">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: "HOA Reply AI",
            description:
              "HOA Reply AI reads every resident email, classifies it, drafts replies, and keeps Gmail as the source of truth.",
            brand: {
              "@type": "Brand",
              name: "HOA Reply AI",
            },
            url: "/",
            applicationCategory: "BusinessApplication",
            offers: {
              "@type": "Offer",
              price: "59",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
          }}
        />
        <LandingHero />

        <section className="grid gap-6 md:grid-cols-2 animate-fade-up" id="pains">
          <div className="card-tilt rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Pain points</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">The inbox is the bottleneck for HOA managers.</h3>
            <p className="mt-2 text-sm text-slate-600">
              Managers lose 2-4 hours a day to email. It kills response times, creates conflict, and burns out boards.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {pains.map((pain) => (
                <li key={pain} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <span>{pain}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-slate-900">HOA Reply AI fixes the choke point: the inbox.</p>
          </div>
          <div className="card-tilt rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]" id="workflow">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">How it works</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">How HOA Reply AI works</h3>
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

        <section id="features" className="grid gap-6 md:grid-cols-3 animate-fade-up animate-delay-1">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-tilt flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/95 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{feature.accent}</p>
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.copy}</p>
            </div>
          ))}
        </section>

        <section id="screenshots" className="space-y-6 rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] animate-fade-up animate-delay-2">
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
              <div key={shot} className="card-tilt aspect-video rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                <div className="flex h-full items-center justify-center">Add {shot} mockup</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 animate-fade-up" id="case-study">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Case study</p>
          <div className="card-tilt rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <h3 className="text-2xl font-semibold text-slate-900">{caseStudy.title}</h3>
            <p className="text-sm text-slate-600">{caseStudy.subtitle}</p>
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

        <section className="space-y-8 animate-fade-up" id="pricing">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Pricing</p>
            <h3 className="text-3xl font-semibold text-slate-900">Simple plans</h3>
            <p className="text-sm text-slate-600">Setup included. Cancel anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`card-tilt flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] ${plan.featured ? "ring-2 ring-blue-500" : ""}`}
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

        <section className="space-y-6 animate-fade-up" id="faq">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">FAQ</p>
          <div className="grid gap-4 md:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q} className="card-tilt rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                <p className="text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Need legal details? <Link href={termsUrl} className="text-blue-600 underline-offset-2 hover:underline">Review our Terms of Service.</Link>
          </p>
        </section>

        <section className="space-y-4 rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] animate-fade-up" id="security">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Security & compliance</p>
          <h3 className="text-2xl font-semibold text-slate-900">Enterprise-ready from day one</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Google OAuth 2.0 connection; no passwords stored</li>
            <li>Data encrypted in transit and at rest</li>
            <li>Private workflow per manager with role-based access</li>
            <li>Detailed activity log and audit trail for approvals</li>
            <li>Configurable data retention and deletion on request</li>
            <li>AI is used only to classify emails and draft replies</li>
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

        <section className="rounded-[32px] border border-white/60 bg-gradient-to-br from-blue-600 to-slate-900 p-10 text-white shadow-[0_40px_90px_rgba(15,23,42,0.35)] animate-fade-up card-tilt">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Ready?</p>
              <h3 className="mt-3 text-3xl font-semibold">Turn inbox chaos into a 2-click workflow.</h3>
              <p className="mt-2 text-sm text-white/80">Managers save hours. Boards get faster replies. Residents stop escalating.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900">
                Start free trial
              </Link>
              <Link href="mailto:hello@hoareply.ai" className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-sm font-semibold">
                Contact sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white/80 py-6 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} HOA Reply AI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href={privacyUrl} className="hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link href={termsUrl} className="hover:text-slate-900">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
