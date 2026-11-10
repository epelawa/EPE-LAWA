import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";
import { Notice, PageFrame, PageIntro, Panel } from "../../components/design-system";

export const metadata: Metadata = pageMetadata({ title: "Contact", description: "Contact-channel availability for EPE LAWA.", path: "/contact" });

export default function ContactPage() {
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Contact" title="A public contact channel is not configured." description="EPE LAWA does not currently publish a contact address or operate a connected message-submission service." />
    <Notice tone="warning" role="status">Message delivery is unavailable. This page does not send or record a request.</Notice>
    <Panel className="ui-stack-sm">
      <h2>Protect your information</h2>
      <p className="ui-muted">Do not share passwords, payment details or sensitive documents in public comments or forum posts. A secure public contact channel must be configured before the site can receive private requests.</p>
      <div className="ui-actions">
        <Link className="btn-secondary" href="/privacy">Review the privacy notice</Link>
        <Link className="btn-ghost" href="/guidelines">Read community guidelines</Link>
      </div>
    </Panel>
  </PageFrame>;
}
