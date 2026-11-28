import type { Metadata } from "next";
import Link from "next/link";
import SupportTicketForm, { FindTicketForm } from "../../components/support-ticket-form";
import { PageFrame, PageIntro, Panel } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import "./support.css";

export const metadata: Metadata = pageMetadata({ title: "Support", description: "Open a support ticket with EPE LAWA and follow the conversation by email.", path: "/support" });

export default function SupportPage() {
  const open = process.env.ENQUIRY_INTAKE_ENABLED === "true" && process.env.SUPPORT_TICKETS_ENABLED !== "false";
  return <PageFrame className="ui-stack">
    <PageIntro title="How can we help?" description="Open a ticket and follow the whole conversation from one private link." />
    <ol className="support-steps" aria-label="How support works">
      <li><strong>Open a ticket</strong><span>You get a reference like EPE-7K3QX9 and a private link by email.</span></li>
      <li><strong>Quick first answer</strong><span>Our AI assistant answers simple questions; anything else goes straight to our team.</span></li>
      <li><strong>Reply any time</strong><span>Add details from your ticket page until it's resolved.</span></li>
    </ol>
    <Panel className="ui-stack">
      {open ? <SupportTicketForm /> : <p role="status">Support tickets are temporarily unavailable. Please check back later; nothing can be submitted now.</p>}
    </Panel>
    <Panel className="ui-stack">
      <h2 className="support-subhead">Already have a ticket?</h2>
      <p>Lost the email? Enter your reference and email and we'll send the private link again.</p>
      <FindTicketForm />
      <p>For corrections, advertising or other enquiries, visit <Link href="/contact">Contact</Link>.</p>
    </Panel>
  </PageFrame>;
}
