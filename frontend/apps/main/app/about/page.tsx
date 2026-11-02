import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@epelawa/ui";
import { pageMetadata } from "../../lib/metadata";

const description =
  "What EPE LAWA is, who runs it, where it broadcasts and how it is funded.";

export const metadata: Metadata = pageMetadata({ title: "About", description, path: "/about" });

export default function AboutPage() {
  return (
    <Container>
      <div className="page-header">
        <p className="page-header__eyebrow">EPE LAWA</p>
        <h1>About EPE LAWA</h1>
        <p className="page-header__lede">
          A community, news and broadcasting platform for Epe Division, Lagos State, at home and
          abroad.
        </p>
      </div>

      <div className="prose">
        <h2>What EPE LAWA is</h2>
        <p>
          EPE LAWA is being built as one place for reporting, public information about people and
          public office holders, radio, community conversation and local businesses in Epe
          Division. It is intended for people living in the division and for people connected to
          it from elsewhere.
        </p>

        <h2>Who runs it</h2>
        <p>
          EPE LAWA is run by its founding team. The editorial staff, their roles, and who may
          approve or publish a story have not been published yet. Those details will appear here
          once they are confirmed.
        </p>

        <h2>Where it broadcasts</h2>
        <p>
          EPE LAWA produces a radio programme on Radio Lagos 107.5 FM Àmitítí. That is a station
          broadcast. Playing it in a browser is a separate thing, and it needs three things this
          project does not have yet: the stream address, its format, and permission to embed it.
        </p>
        <p>
          So the web player is not connected yet. There is nothing to listen to on this site
          today, and the site does not pretend otherwise.
        </p>

        <h2>How it is funded</h2>
        <p>
          No funding arrangement has been agreed and published. EPE LAWA does not charge for
          publication, and no paid placement or sponsorship is live. If a funding arrangement is
          agreed, it will be stated on this page before it takes effect.
        </p>

        <h2>What is not connected yet</h2>
        <p>
          News, radio, the Who is Who directory, the forum, member accounts and the business
          directory are all not connected yet. The pages that exist today are the ones linked in
          the header and footer. Nothing else is advertised.
        </p>

        <h2>Contact</h2>
        <p>
          Write to <a href="mailto:info.epelawa@gmail.com">info.epelawa@gmail.com</a>, or use the{" "}
          <Link href="/contact">contact page</Link>. Corrections and privacy requests go to the
          same address.
        </p>
        <p>
          <Link href="/">Return to the homepage</Link>
        </p>
      </div>
    </Container>
  );
}
