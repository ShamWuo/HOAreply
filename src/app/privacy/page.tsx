import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const generateMetadata = () =>
  buildMetadata({
    title: "HOA Reply AI Privacy Policy",
    canonicalPath: "/privacy",
  });

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Privacy</p>
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-slate-600">
            Clear controls for managers and boards. You can exit this page anytime via the buttons on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300"
          >
            Back to homepage
          </Link>
          <Link
            href="/app/dashboard"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.2)] transition hover:translate-y-0.5"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-700">
        HOA Reply AI (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides an AI-powered email assistant for homeowner
        association managers. This Privacy Policy explains what Google user data we access, why we
        access it, how we use it, where we store it, and how you can request deletion.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What data we access</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
          <li>Basic profile information (name, email) from Google Sign-In.</li>
          <li>
            Gmail messages for mailboxes you connect (subject, body, attachments metadata) — used only
            to classify and generate reply drafts.
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">How we use Google user data</h2>
        <p className="mt-3 text-sm text-slate-700">
          We use Gmail data to automatically classify incoming messages (example: maintenance, violations,
          billing) and to generate suggested reply drafts for your review. We do not send emails on your
          behalf without explicit approval. We only use Google data for the purposes described here and in
          the onboarding UI.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Sharing and third parties</h2>
        <p className="mt-3 text-sm text-slate-700">
          We may send normalized message data and reply drafts to configured automation endpoints (for
          example your n8n webhook) to integrate with workflows. We do not sell Google user data. Any
          third-party integrations you connect are governed by their own terms and privacy policies.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Storage, retention, and security</h2>
        <p className="mt-3 text-sm text-slate-700">
          We store only the data necessary to provide the service (mailbox identifiers, message metadata,
          classifications, and drafts). You can configure data retention in your account settings or
          request deletion by contacting us. Data is encrypted in transit and at rest; access is limited to
          authorized systems and personnel.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Limited Use and Google Data</h2>
        <p className="mt-3 text-sm text-slate-700">
          We adhere to Google&apos;s Limited Use requirements. Google account and Gmail data accessed through
          Google OAuth is used only to provide the features described above (classification, draft
          generation, and logging). If you revoke access from your Google account, we will no longer access
          that mailbox and can remove associated stored data on request.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">In-product privacy notifications</h2>
        <p className="mt-3 text-sm text-slate-700">
          When you connect a Gmail account we display clear, contextual notices describing what data will be
          accessed and how it will be used. These notices appear during the connection flow and inside the app
          header so managers can review them anytime.
        </p>
      </section>

      <section className="mt-6" id="data-deletion">
        <h2 className="text-xl font-semibold">Your choices, deletion, and contact</h2>
        <p className="mt-3 text-sm text-slate-700">
          You can disconnect Gmail accounts at any time from the app settings. To request data deletion,
          corrections, or export of your data, contact us at{" "}
          <Link href="mailto:privacy@hoareply.ai">privacy@hoareply.ai</Link>. We respond to verified
          requests within 5 business days and delete data within 30 days unless legal obligations
          require retention.
        </p>
      </section>

      <section className="mt-8 text-sm text-slate-600">
        <p>
          This Privacy Policy lives at https://hoareply.com/privacy. Use the exact same link when configuring
          your Google Cloud OAuth consent screen and when referencing the policy in external listings.
        </p>
      </section>
    </div>
  );
}
