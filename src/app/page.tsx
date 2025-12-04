import { LandingHero } from "@/components/landing/hero";
import { LandingNavbar } from "@/components/landing/navbar";
import Link from "next/link";

const valuePropositions = [
  {
    title: "Never miss a resident email",
    copy: "All inboxes in one view with clear priorities so nothing slips through.",
  },
  {
    title: "Drafts you can trust",
    copy: "AI writes the first reply based on your HOA docs and tone—boards just review and send.",
  },
  {
    title: "Zero change to Gmail",
    copy: "Keep Gmail as the source of truth. We handle routing, drafts, and approvals in the background.",
  },
];

const featureShowcase = [
  {
    heading: "Approve replies in one click",
    body: "AI drafts responses for common resident questions. Boards skim, edit if needed, and send without hunting through Gmail.",
    highlight: "Cuts response time without new tools",
    accent: "Board-friendly",
  },
  {
    heading: "Gmail stays the source of truth",
    body: "No new mailbox to learn. Threads stay in Gmail; we layer the triage, drafts, and handoffs on top.",
    highlight: "Uses the inbox boards already trust",
    accent: "Keep Gmail",
  },
  {
    heading: "Built-in handoffs and escalations",
    body: "Route maintenance, approvals, and escalations through your existing n8n automations without extra steps for the board.",
    highlight: "Plays nicely with your workflows",
    accent: "Handoffs",
  },
];

const testimonials = [
  {
    quote:
      "We stopped forwarding threads around. Drafts are waiting for the board, and replies go out the same day.",
    name: "Maya Lopez",
    role: "Director of Community Operations, Atlas HOA",
  },
  {
    quote:
      "Connecting Gmail took minutes. Approvals, AI replies, and maintenance escalations all stay in one flow.",
    name: "Harrison Lee",
    role: "CTO, Mariner Boards",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$149",
    descriptor: "per HOA / month",
    features: ["1 Gmail inbox", "AI drafts + approvals", "Setup included"],
    cta: "Start Starter",
  },
  {
    name: "Standard",
    price: "$279",
    descriptor: "per HOA / month",
    badge: "Most Popular",
    features: ["3 Gmail inboxes", "Automations + handoffs", "Priority support", "Setup included"],
    cta: "Start Standard",
    featured: true,
  },
  {
    name: "Management",
    price: "Custom",
    descriptor: "for portfolios",
    features: ["Unlimited HOAs", "Dedicated onboarding", "SLA-backed uptime"],
    cta: "Talk to us",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <LandingNavbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-20 pt-16 md:px-6">
        <LandingHero />

        <section className="grid gap-6 md:grid-cols-3" id="value">
          {valuePropositions.map((value) => (
            <div
              key={value.title}
              className="glass-panel flex flex-col gap-3 rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)]"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">◆</span>
              <h3 className="text-xl font-semibold text-slate-900">{value.title}</h3>
              <p className="text-sm text-slate-600">{value.copy}</p>
            </div>
          ))}
        </section>

        <section id="features" className="space-y-16">
          {featureShowcase.map((feature, index) => (
            <div
              key={feature.heading}
              className={`grid items-center gap-10 rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] lg:grid-cols-2`}
            >
              <div className={`${index % 2 ? "lg:order-2" : ""} space-y-4`}>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">{feature.accent}</p>
                <h3 className="text-3xl font-semibold text-slate-900">{feature.heading}</h3>
                <p className="text-base text-slate-600">{feature.body}</p>
                <p className="text-sm font-semibold text-blue-600">{feature.highlight}</p>
              </div>
              <div className={`${index % 2 ? "lg:order-1" : ""}`}>
                <div className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-[0_40px_90px_rgba(15,23,42,0.4)]">
                  <p className="text-sm text-slate-400">Live preview</p>
                  <div className="mt-4 space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                        <p className="text-base font-semibold">Thread {item}</p>
                        <p className="text-sm text-slate-300">AI draft ready · SLA 92%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section id="workflow" className="rounded-[32px] border border-white/50 bg-slate-50/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-8 md:grid-cols-3">
            {["Connect", "Automate", "Delight"].map((step, index) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-blue-600">0{index + 1}</span>
                <h4 className="text-xl font-semibold text-slate-900">{step}</h4>
                <p className="text-sm text-slate-600">
                  {index === 0 && "Secure Google OAuth per HOA with automated token refresh."}
                  {index === 1 && "Push threads through n8n: escalate, assign, and capture AI replies with full audit."}
                  {index === 2 && "Deliver consistent, empathetic responses while boards monitor every draft."}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="space-y-10">
          <div className="flex flex-col gap-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Proof</p>
            <h2 className="text-3xl font-semibold">HOA leaders ship faster with BoardInbox AI</h2>
            <p className="text-base text-slate-600">From boutique boards to multi-state portfolios.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-[28px] border border-white/60 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                <p className="text-lg text-slate-700">“{testimonial.quote}”</p>
                <div className="mt-6 text-sm">
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="space-y-10">
          <div className="flex flex-col gap-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Pricing</p>
            <h2 className="text-3xl font-semibold">Scale from a single HOA to your full portfolio</h2>
            <p className="text-base text-slate-600">Flexible plans with unlimited collaborators.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)] ${
                  plan.featured ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {plan.badge ? (
                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    {plan.badge}
                  </span>
                ) : null}
                <h3 className="mt-4 text-2xl font-semibold text-slate-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-semibold text-slate-900">{plan.price}</span>
                  <span className="ml-1 text-sm text-slate-500">{plan.descriptor}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
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

        <section className="rounded-[32px] border border-white/60 bg-gradient-to-br from-blue-600 to-slate-900 p-10 text-white shadow-[0_40px_90px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Ready?</p>
              <h3 className="mt-3 text-3xl font-semibold">Give your board a concierge-grade inbox</h3>
              <p className="mt-2 text-sm text-white/80">Connect Gmail, wire up n8n, and start replying in one afternoon.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900"
              >
                Get started
              </Link>
              <Link
                href="mailto:hello@boardinbox.ai"
                className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-sm font-semibold"
              >
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
            <p className="mt-2 text-sm">Premium inbox automation for HOA boards.</p>
          </div>
          {[
            {
              title: "Product",
              links: ["Features", "Workflow", "Security"],
            },
            {
              title: "Company",
              links: ["About", "Careers", "Partners"],
            },
            {
              title: "Resources",
              links: ["Docs", "Customer Stories", "Status"],
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
        <div className="border-t border-white/80 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BoardInbox AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
