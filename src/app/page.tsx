import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const generateMetadata = () =>
  buildMetadata({
    title: "HOA Reply | Structured, accountable HOA email",
    description: "Turn resident emails into tracked requests with status, ownership, and approved language. Built for boards and community managers.",
    canonicalPath: "/",
  });

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "How it Works", href: "#how" },
  { label: "Templates", href: "#templates" },
  { label: "Analytics", href: "#analytics" },
  { label: "Pricing", href: "#pricing" },
  { label: "Sign in", href: "/auth/login" },
];

const pains = [
  "Resident emails are easy to miss or forget",
  "No shared visibility across board members",
  "Inconsistent responses create risk",
  "No audit trail of decisions or replies",
];

const steps = [
  {
    title: "Connect your existing inbox",
    bullets: ["Secure Google OAuth", "We read incoming mail only", "Gmail remains the source of truth"],
  },
  {
    title: "Emails become requests",
    bullets: ["Each resident message is categorized", "Status, priority, and SLA are assigned", "Non-requests stay out of the way"],
  },
  {
    title: "Respond with confidence",
    bullets: ["Approved templates", "Human-reviewed drafts", "Full audit history"],
  },
];

const features = [
  { title: "Structured Requests", detail: "Every issue has a status and history" },
  { title: "Focused Inbox", detail: "Only items that need attention appear" },
  { title: "Templates", detail: "Pre-approved, consistent response language" },
  { title: "AI Summaries", detail: "Quickly understand long threads — no hallucinated policy interpretation" },
  { title: "Audit Log", detail: "See who did what, and when" },
];

const governance = [
  "No auto-sending emails",
  "Human approval required",
  "Clear records for every action",
  "Designed for compliance and continuity",
];

const audiences = [
  {
    title: "HOA Boards",
    bullets: ["Shared visibility", "Consistent communication", "Reduced volunteer burnout"],
  },
  {
    title: "HOA Management Companies",
    bullets: ["Centralized inbox handling", "Clear SLAs", "Easier onboarding across associations"],
  },
];

const security = ["Google OAuth", "Permissions scoped to mailbox", "No selling data", "Delete data on request"];

const siteUrl = "https://hoareply.com";
const privacyUrl = `${siteUrl}/privacy`;
const termsUrl = `${siteUrl}/terms`;

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-20 pt-12 md:px-6">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">HOA Reply</p>
          <h1 className="text-4xl font-semibold text-slate-900">HOA email, structured and accountable.</h1>
          <p className="max-w-2xl text-base text-slate-700">
            Turn resident emails into tracked requests with clear status, ownership, and approved response language.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/connect/gmail"
              className="rounded-md border border-slate-300 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Connect Gmail
            </Link>
            <Link href="#product" className="text-sm font-semibold text-slate-800 hover:text-slate-900">
              View product
            </Link>
          </div>
        </section>

        <section id="problem" className="space-y-4 border border-slate-200 bg-slate-50/70 p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Email wasn’t built for HOA governance.</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {pains.map((pain) => (
              <li key={pain} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-600" />
                <span>{pain}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">How HOA Reply works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {step.bullets.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Key features</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                <p className="text-sm text-slate-700">{feature.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="templates" className="space-y-3 border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Governed templates</h2>
          <p className="text-sm text-slate-700">Approved language for known situations. No auto-send. Boards stay in control.</p>
          <div className="flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded border border-slate-200 bg-slate-50 px-3 py-1">Default templates per situation</span>
            <span className="rounded border border-slate-200 bg-slate-50 px-3 py-1">Active / inactive states</span>
            <span className="rounded border border-slate-200 bg-slate-50 px-3 py-1">Audit on every change</span>
          </div>
        </section>

        <section id="analytics" className="space-y-3 border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Analytics</h2>
          <p className="text-sm text-slate-700">Visibility into volume, SLA risk, and outcomes across boards and associations.</p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>Overdue and at-risk requests</li>
            <li>Category trends</li>
            <li>Response time tracking</li>
          </ul>
        </section>

        <section className="space-y-4 border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Built for boards, not shortcuts.</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {governance.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">HOA Reply supports decision-making. It does not replace it.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {audiences.map((audience) => (
            <div key={audience.title} className="border border-slate-200 bg-white p-5">
              <h3 className="text-xl font-semibold text-slate-900">{audience.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {audience.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="space-y-3 border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Security & privacy</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {security.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href={privacyUrl} className="text-sm font-semibold text-slate-800 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
        </section>

        <section id="pricing" className="space-y-4 border border-slate-200 bg-slate-50/70 p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Pricing</h2>
          <p className="text-sm text-slate-700">Simple, transparent pricing for boards and management companies.</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-800">
            <div className="rounded border border-slate-200 bg-white px-4 py-3">
              <p className="text-base font-semibold text-slate-900">Boards</p>
              <p>Flat monthly fee per association</p>
            </div>
            <div className="rounded border border-slate-200 bg-white px-4 py-3">
              <p className="text-base font-semibold text-slate-900">Management companies</p>
              <p>Volume pricing across associations</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Bring structure to HOA communication.</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/connect/gmail"
              className="rounded-md border border-slate-300 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Connect Gmail
            </Link>
            <Link href="/auth/login" className="text-sm font-semibold text-slate-800 hover:text-slate-900">
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-700 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex gap-4">
            <Link href={privacyUrl} className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href={termsUrl} className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/security" className="hover:text-slate-900">
              Security
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
              Contact
            </Link>
          </div>
          <p className="text-slate-600">© {new Date().getFullYear()} HOA Reply</p>
        </div>
      </footer>
    </div>
  );
}
