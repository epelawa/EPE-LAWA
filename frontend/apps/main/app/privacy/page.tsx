import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Container } from "@epelawa/ui";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "What EPE LAWA collects, why, who processes it, how long it is kept and how to ask for deletion.";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description, path: "/privacy" });

export default function PrivacyPage() {
  return (
    <Container>
      <div className="page-header">
        <p className="page-header__eyebrow">EPE LAWA</p>
        <h1>Privacy notice</h1>
        <p className="page-header__lede">
          What this site collects today, what it will collect, and who will process it.
        </p>
      </div>

      <div className="prose">
        <Alert tone="warning" title="This notice needs legal review">
          <p>
            It is written to be accurate about the current build, not to be a finished legal
            document. It has not been reviewed by a lawyer and it is not legal advice.
          </p>
        </Alert>

        <h2>What is collected today</h2>
        <p>Almost nothing, and that is deliberate at this stage of the build.</p>
        <ul>
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

        <h2>Cookies and tracking</h2>
        <p>
          No cookies are set today. There is no analytics tool, no advertising pixel and no social
          tracking script on this site.
        </p>

        <h2>Who processes it</h2>
        <p>
          These are the intended processors. None of them is configured yet, and each will be
          named here with its purpose and region before it handles real data.
        </p>
        <ul>
          <li>Supabase: database, and accounts when member accounts are built.</li>
          <li>Google Cloud: hosting, request logs and media storage.</li>
          <li>Resend: sending email such as verification and reply notifications.</li>
          <li>Paystack: payments, if and when the marketplace opens.</li>
        </ul>

        <h2>How long it is kept</h2>
        <p>
          No retention periods have been set, because nothing is being collected. Retention has to
          be decided and published before accounts or payments open.
        </p>

        <h2>Asking about your data, or deleting it</h2>
        <p>
          Under Nigerian data protection law you can ask what is held about you, ask for it to be
          corrected, and ask for it to be deleted. Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and a person will answer. Because
          no accounts exist yet, there is normally nothing to find.
        </p>

        <h2>Children</h2>
        <p>
          This notice does not set an age policy. That decision is needed before member accounts
          open, and it will be published here first.
        </p>

        <h2>Changes</h2>
        <p>
          If this notice changes, the change will be published on this page. Questions about it go
          to the same address as everything else, or through the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </Container>
  );
}
