import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "Plain-language terms for using EPE LAWA, what the site offers today and what it does not.";

export const metadata: Metadata = pageMetadata({ title: "Terms", description, path: "/terms" });

export default function TermsPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Terms of use</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          A plain description of what you can expect from this site, and what it expects from you.
        </p>
      </div>

      <div className="prose">
        <h2 className="mt-8 mb-3 text-lg font-bold">Using this site</h2>
        <p className="mb-6">
          You can read, quote and link to anything public here. You may not attack the site, try to
          reach parts that are not public, overload it deliberately, or copy it wholesale and
          present it as your own.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">What this site offers today</h2>
        <p className="mb-6">
          Only the pages linked in the header and footer. Other sections are described on this site
          but are not connected yet.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Accuracy</h2>
        <p className="mb-6">
          We aim to be accurate and to correct mistakes openly. We do not promise that everything
          here is complete or current. If you find an error, tell us and it will be checked.
        </p>
        <p className="mb-6">
          Nothing on this site is legal, medical, financial or professional advice.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Content ownership</h2>
        <p className="mb-6">
          Text and photographs published here belong to EPE LAWA or to the person credited. Quoting
          a passage with attribution and a link is fine. Republishing a whole piece is not.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Anything you send us</h2>
        <p className="mb-6">
          Messages sent through the contact form are used only to reply to you. They are not stored
          for marketing or shared with third parties.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Availability</h2>
        <p className="mb-6">
          The site may be unavailable while it is being built or maintained. Features described but
          not connected are not a promise of a date.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Liability</h2>
        <p className="mb-6">
          To the extent the law allows, EPE LAWA is not liable for loss caused by relying on this
          site or by it being unavailable. Nothing here limits a right you have under Nigerian law.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Governing law</h2>
        <p className="mb-6">
          This has not been settled yet. It needs a legal decision, and it will be stated here
          before it matters.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Changes to these terms</h2>
        <p className="mb-6">
          Changes will be published on this page. Questions go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
            {CONTACT_EMAIL}
          </a> or through the{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            contact page
          </Link>.
        </p>
      </div>
    </div>
  );
}
