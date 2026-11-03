import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "What EPE LAWA collects, why, who processes it, how long it is kept and how to ask for deletion.";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description, path: "/privacy" });

export default function PrivacyPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Privacy notice</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">
          What this site collects today, what it will collect, and who will process it.
        </p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-8">
        <h3 className="font-semibold text-red-900 mb-2">This notice needs legal review</h3>
        <p className="text-red-800 text-sm">
          It is written to be accurate about the current build, not to be a finished legal
          document. It has not been reviewed by a lawyer and it is not legal advice.
        </p>
      </div>

      <div className="prose">
        <h2 className="mt-8 mb-3 text-lg font-bold">What is collected today</h2>
        <p className="mb-6">
          Almost nothing, and that is deliberate at this stage of the build.
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
          <li>
            The contact form checks your text in the browser and on the server, then tells you it
            cannot deliver it. Nothing you type is stored, forwarded or logged.
          </li>
          <li>
            Once this site is running on its production host, the host will record standard
            request data such as IP address, browser user agent, requested address and time. That
            is used for security and fault diagnosis, not for advertising.
          </li>
          <li>
            There are no accounts, comments, reviews or orders yet, so none of that data exists.
          </li>
        </ul>

        <h2 className="mt-10 mb-3 text-lg font-bold">Cookies and tracking</h2>
        <p className="mb-6">
          No cookies are set today. There is no analytics tool, no advertising pixel and no social
          tracking script on this site.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Who processes it</h2>
        <p className="mb-6">
          These are the intended processors. None of them is configured yet, and each will be
          named here with its purpose and region before it handles real data.
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
          <li>Supabase: database, and accounts when member accounts are built.</li>
          <li>Google Cloud: hosting, request logs and media storage.</li>
          <li>Resend: sending email such as verification and reply notifications.</li>
          <li>Paystack: payments, if and when the marketplace opens.</li>
        </ul>

        <h2 className="mt-10 mb-3 text-lg font-bold">How long it is kept</h2>
        <p className="mb-6">
          No retention periods have been set, because nothing is being collected. Retention has to
          be decided and published before accounts or payments open.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Asking about your data, or deleting it</h2>
        <p className="mb-6">
          Under Nigerian data protection law you can ask what is held about you, ask for it to be
          corrected, and ask for it to be deleted. Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline underline-offset-4">
            {CONTACT_EMAIL}
          </a> and a person will answer. Because no accounts exist yet, there is normally nothing to find.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Children</h2>
        <p className="mb-6">
          This notice does not set an age policy. That decision is needed before member accounts
          open, and it will be published here first.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Changes</h2>
        <p className="mb-6">
          If this notice changes, the change will be published on this page. Questions about it go
          to the same address as everything else, or through the{" "}
          <Link href="/contact" className="text-blue-600 underline underline-offset-4">
            contact page
          </Link>.
        </p>
      </div>
    </div>
  );
}
