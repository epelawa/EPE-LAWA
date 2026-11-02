import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Container } from "@epelawa/ui";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "Plain-language terms for using EPE LAWA, what the site offers today and what it does not.";

export const metadata: Metadata = pageMetadata({ title: "Terms", description, path: "/terms" });

export default function TermsPage() {
  return (
    <Container>
      <div className="page-header">
        <p className="page-header__eyebrow">EPE LAWA</p>
        <h1>Terms of use</h1>
        <p className="page-header__lede">
          A plain description of what you can expect from this site, and what it expects from you.
        </p>
      </div>

      <div className="prose">
        <Alert tone="warning" title="These terms need legal review">
          <p>
            They are written plainly so they can be read. They have not been reviewed by a lawyer
            and they are not legal advice.
          </p>
        </Alert>

        <h2>Using this site</h2>
        <p>
          You can read, quote and link to anything public here. You may not attack the site, try to
          reach parts that are not public, overload it deliberately, or copy it wholesale and
          present it as your own.
        </p>

        <h2>What this site offers today</h2>
        <p>
          Only the pages linked in the header and footer. News, radio, the directory, the forum and
          member accounts are described on this site but are not connected yet, and nothing here is
          an offer of those services.
        </p>

        <h2>Accuracy</h2>
        <p>
          We aim to be accurate and to correct mistakes openly. We do not promise that everything
          here is complete or current. If you find an error, tell us and it will be checked.
        </p>
        <p>
          Nothing on this site is legal, medical, financial or professional advice.
        </p>

        <h2>Content ownership</h2>
        <p>
          Text and photographs published here belong to EPE LAWA or to the person credited. Quoting
          a passage with attribution and a link is fine. Republishing a whole piece is not.
        </p>

        <h2>Anything you send us</h2>
        <p>
          The contact form does not deliver yet, so send nothing confidential through it. Messages
          sent by email are used only to answer you and to correct the record where relevant.
        </p>

        <h2>Availability</h2>
        <p>
          The site may be unavailable while it is being built or maintained. Features described but
          not connected are not a promise of a date.
        </p>

        <h2>Liability</h2>
        <p>
          To the extent the law allows, EPE LAWA is not liable for loss caused by relying on this
          site or by it being unavailable. Nothing here limits a right you have under Nigerian law.
        </p>

        <h2>Governing law</h2>
        <p>
          This has not been settled yet. It needs a legal decision, and it will be stated here
          before it matters.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          Changes will be published on this page. Questions go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or through the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </Container>
  );
}
