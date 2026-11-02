import type { Metadata } from "next";
import { Alert, Container } from "@epelawa/ui";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";
import ContactForm from "./contact-form";

const description =
  "How to reach EPE LAWA. Email is the only working route today; the contact form checks your text but cannot deliver it yet.";

export const metadata: Metadata = pageMetadata({ title: "Contact", description, path: "/contact" });

export default function ContactPage() {
  return (
    <Container>
      <div className="page-header">
        <p className="page-header__eyebrow">EPE LAWA</p>
        <h1>Contact EPE LAWA</h1>
        <p className="page-header__lede">
          Corrections, privacy requests, questions about the project, or anything the guidelines
          do not cover.
        </p>
      </div>

      <div className="prose">
        <Alert tone="warning" title="Message delivery is not connected yet">
          <p>
            The form below checks what you write, but it cannot send it. Nothing you type is
            stored, forwarded or read by anyone. To reach a person today, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Alert>

        <h2>Send a message</h2>
        <p>
          When delivery is connected, messages will go to the address above. Until then, the form
          is here so the layout, labels and error messages can be reviewed and tested for real.
        </p>
        <ContactForm />

        <h2>Other ways to reach us</h2>
        <ul>
          <li>
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. This is the only
            published address and it is used for everything, including corrections and account
            deletion requests.
          </li>
          <li>
            WhatsApp: no number has been published yet. A WhatsApp link that opens nothing would
            be worse than saying so, so there is no WhatsApp button on this page.
          </li>
        </ul>

        <h2>Emergencies</h2>
        <p>
          This is not an emergency service. Nothing sent through this site is monitored. If
          someone is in danger, contact the Nigeria Police Force or emergency services directly.
        </p>
      </div>
    </Container>
  );
}
