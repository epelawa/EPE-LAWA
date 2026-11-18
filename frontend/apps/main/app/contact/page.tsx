import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/enquiry-form";
import { pageMetadata } from "../../lib/metadata";
import { PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, Notice } from "../../components/design-system";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Current availability of EPE LAWA contact and report intake.",
  path: "/contact",
});

export default function ContactPage() {
  if (process.env.ENQUIRY_INTAKE_ENABLED === "true") return <PageFrame className="ui-stack"><PageIntro eyebrow="Contact" title="Contact EPE LAWA" description="Send the team a message or report a correction." /><Panel className="ui-stack"><h2>General enquiry</h2><EnquiryForm kind="contact" /></Panel><Panel className="ui-stack"><h2>Request a correction</h2><EnquiryForm kind="correction" /></Panel></PageFrame>;
  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Contact"
        title="Contact intake is coming soon."
        description="A private, reliable channel for receiving messages has not been configured yet."
        meta={<StatusBadge tone="warning">Coming Soon</StatusBadge>}
      />
      <Panel className="ui-stack">
        <SectionHeading
          title="No message is received"
          description="Email delivery and secure message storage are not connected."
        />
        <Notice tone="warning">
          Do not submit personal or sensitive information here. This page does not accept messages; nothing is sent or stored.
        </Notice>
        <p className="ui-muted">Correction, privacy, safety and general enquiries cannot currently be received through this site. This page will be updated when a secure channel is available.</p>
        <div className="ui-actions">
          <Link className="ui-text-link" href="/privacy">Read the privacy notice</Link>
          <Link className="ui-text-link" href="/guidelines">Read the community guidelines</Link>
        </div>
      </Panel>
    </PageFrame>
  );
}
