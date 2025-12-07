import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

const privacyUrl = "https://hoareply.com/privacy";

export const generateMetadata = () =>
  buildMetadata({
    title: "HOA Reply AI Terms of Service",
    canonicalPath: "/terms",
  });

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-4 text-sm text-slate-700">
        These Terms of Service (&quot;Terms&quot;) govern access to and use of HOA Reply AI (&quot;we,&quot;
        &quot;us,&quot; &quot;our&quot;). By creating an account, connecting Gmail, or otherwise using the product at
        hoareply.com you agree to these Terms.
      </p>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">1. Eligibility & acceptable use</h2>
        <p>
          You must be at least 18 and authorized by the HOA or management company you represent. If you are
          under 18, you must use the service only through an organization-owned account with adult authorization.
          You agree not to misuse the service (including spamming residents, reverse engineering, or attempting to
          access other users&apos; data).
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">2. Google OAuth & Gmail data</h2>
        <p>
          When you connect Gmail we access message metadata and content solely to classify resident
          communications, generate draft replies, and log outcomes you approve. We follow Google&apos;s Limited
          Use requirements; revoking access in Google immediately stops further ingestion. Details are in
          our <Link href={privacyUrl}>Privacy Policy</Link>.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">3. AI-generated content disclaimer</h2>
        <p>
          Drafts produced by HOA Reply AI are suggestions. You remain responsible for reviewing,
          editing, and approving each response. We do not guarantee factual accuracy, compliance with
          governing documents, or legal sufficiency. The service does not provide legal advice.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">4. Data storage, security, and retention</h2>
        <p>
          We store the minimum information required to operate: mailbox identifiers, classifications,
          drafts, and audit logs. Data is encrypted in transit and at rest. You can request deletion at any
          time from the in-app data request option; we delete production data within 30 days unless retention is
          legally required.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">5. Payments and refunds</h2>
        <p>
          Paid plans renew monthly unless cancelled. Fees are non-refundable except where required by law or
          explicitly stated in writing. You may cancel future billing at any time inside the app or by contacting
          support. Any usage-based fees (e.g., add-on integrations) are invoiced according to your plan.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">6. Suspension & termination</h2>
        <p>
          We may suspend or terminate accounts that violate these Terms or applicable laws. You may
          terminate your account anytime; upon termination we stop providing the service and delete your
          data per the privacy policy.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">7. Liability</h2>
        <p>
          HOA Reply AI is provided &quot;as is&quot; without warranties of any kind. To the fullest extent
          permitted by law we are not liable for indirect, incidental, consequential, or punitive damages,
          nor for errors or omissions in AI-generated output. Total liability for any claim is limited to
          USD $500 or the fees paid to us in the 12 months preceding the event, whichever is greater.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">8. Force majeure</h2>
        <p>
          We are not liable for delays or failures caused by events beyond reasonable control, including
          natural disasters, internet or carrier outages, acts of government, or other force majeure events.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">9. Governing law & disputes</h2>
        <p>
          These Terms are governed by the laws of the State of Colorado, excluding conflict-of-laws
          principles. Disputes will be handled in state or federal courts located in Denver County, Colorado.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-xl font-semibold">10. Updates & contact</h2>
        <p>
          We may update these Terms occasionally; we will post the effective date and notify administrators
          via email or in-app notices when changes are material. Questions? Use the in-app support channel in your account settings.
        </p>
      </section>
    </div>
  );
}
