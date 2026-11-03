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
          What this site collects, how it is used and how to ask for deletion.
        </p>
      </div>

      <div className="prose">
        <h2 className="mt-8 mb-3 text-lg font-bold">What is collected</h2>
        <p className="mb-6">
          Only what you choose to give us through the contact form: your name, email address and
          message text. Nothing else is collected from visitors.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">How it is used</h2>
        <p className="mb-6">
          Your email address and message are used only to reply to you. They are not sold, shared
          with third parties, or used for marketing.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Cookies and tracking</h2>
        <p className="mb-6">
          No cookies are set today. There is no analytics tool, no advertising pixel and no social
          tracking script on this site.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">How long it is kept</h2>
        <p className="mb-6">
          Messages sent through the contact form are kept only as long as needed to reply to them.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Asking about your data, or deleting it</h2>
        <p className="mb-6">
          Under Nigerian data protection law you can ask what is held about you, ask for it to be
          corrected, and ask for it to be deleted. Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline underline-offset-4">
            {CONTACT_EMAIL}
          </a> and a person will answer.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Children</h2>
        <p className="mb-6">
          This site is not directed at children under 13. We do not knowingly collect personal
          information from children.
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
