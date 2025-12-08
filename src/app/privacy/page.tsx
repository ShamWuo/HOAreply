import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const generateMetadata = () =>
  buildMetadata({
    title: "HOA Reply Privacy Policy",
    canonicalPath: "/privacy",
  });

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Privacy</p>
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-slate-600">
        Clear controls for managers and boards. Use the site header to navigate back to the app or homepage.
      </p>
      <p className="mt-4 text-sm text-slate-700">
        This Privacy Policy applies to users of HOA Reply services in the United States. HOA Reply (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides an email management and request-tracking service for homeowner
        association managers and boards. This Privacy Policy explains what Google user data we access, why we
        access it, how we use it, where we store it, and how you can request deletion.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What data we access</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
          <li>Basic profile information (name, email) from Google Sign-In.</li>
          <li>
            Gmail messages for mailboxes you connect (subject, body, attachment filenames and MIME types only - not file contents) - used only
            to classify and generate reply drafts.
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">What we do NOT do with Gmail data</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
          <li>We do not use Gmail data to train machine learning models outside your workflows.</li>
          <li>We do not use Gmail data for advertising or marketing.</li>
          <li>We do not access messages outside the inboxes you explicitly connect.</li>
          <li>We do not share Gmail data with third parties unrelated to providing the service.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">How we use Google user data</h2>
        <p className="mt-3 text-sm text-slate-700">
          We use Gmail data to automatically classify incoming messages (example: maintenance, violations,
          billing) and to generate suggested reply drafts for your review. We do not send emails on your
          behalf without explicit approval, and every generated draft requires explicit human review and approval before sending. We only use Google data for the purposes described here and in
          the onboarding UI.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Sharing and third parties</h2>
        <p className="mt-3 text-sm text-slate-700">
          By default, all message normalization, classification, and drafting stay inside HOA Reply. We do not export Gmail data to third-party systems unless you explicitly configure an integration. We do not sell Google user data. Third-party integrations you connect are governed by their own terms and privacy policies, and may not retain or reuse Gmail data for their own purposes.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Storage, retention, and security</h2>
        <p className="mt-3 text-sm text-slate-700">
          We store only the data necessary to provide the service (mailbox identifiers; message metadata such as subject, sender, timestamp; classifications; and user-approved drafts). By default, message metadata and drafts are retained for 90 days unless
          you configure a different retention period. You can configure data retention in your account settings
          or request deletion by contacting us. Data is encrypted in transit and at rest; access is limited to
          automated systems required to provide the service; HOA Reply staff do not routinely access mailbox content.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Limited Use and Google Data</h2>
        <p className="mt-3 text-sm text-slate-700">
          We adhere to Google&apos;s Limited Use requirements. Google account and Gmail data accessed through
          Google OAuth is used only to provide the features described above (classification, draft
          generation, and logging). All generated drafts require explicit human review and approval before sending. If you revoke access from your Google account, we will no longer access
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
          corrections, or export of your data, use the data request option in your account settings. We respond to verified
          requests within 5 business days and delete data within 30 days unless legal obligations
          require retention.
        </p>
      </section>

      <section className="mt-8 text-sm text-slate-600">
        <p>This Privacy Policy lives at https://hoareply.com/privacy.</p>
        <p className="mt-3">
          See also our <Link href="/terms" className="text-blue-600 underline">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}
