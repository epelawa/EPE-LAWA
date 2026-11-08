import InformationPage from "../../components/information-page";
import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "Plain-language terms for using EPE LAWA, what the site offers today and what it does not.";

export const metadata: Metadata = pageMetadata({ title: "Terms", description, path: "/terms" });

export default function TermsPage() {
  return <InformationPage title="Terms of use" description="What you can expect from EPE LAWA, and what the community expects from you.">
<h2>Using this site</h2>
        <p>
          You can read, quote and link to anything public here. You may not attack the site, try to
          reach parts that are not public, overload it deliberately, or copy it wholesale and
          present it as your own.
        </p>

        <h2>What this site offers today</h2>
        <p>
          The web platform covers news, community history, the forum, maps, local businesses and marketplace requests, tourism, radio, and Who is Who. Individual services that need a provider or further configuration are labelled Coming Soon. The native mobile app is deferred.
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
          Messages sent through the contact form are used only to reply to you. They are not stored
          for marketing or shared with third parties.
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
          <a href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a> or through the{" "}
          <Link href="/contact">
            contact page
          </Link>.
        </p>
  </InformationPage>;
}
