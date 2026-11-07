import type { Metadata } from "next";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";
import { PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, Notice } from "../../components/design-system";
import ContactForm from "./contact-form";
export const metadata: Metadata = pageMetadata({ title: "Contact", description: "How to reach EPE LAWA.", path: "/contact" });
export default function ContactPage() {
  return <PageFrame><PageIntro eyebrow="Let’s talk" title="A good place to start." description="Questions, corrections, community stories or privacy requests—here’s how to reach the EPE LAWA team."/><div className="ui-split"><Panel><SectionHeading title="Write to the team" description="Email is the available contact channel."/><a className="btn-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><hr className="ui-divider"/><div className="ui-row"><h2>Message form</h2><StatusBadge tone="warning">Coming Soon</StatusBadge></div><Notice tone="warning">Form delivery is not connected yet. The form below can check a draft, but it does not send or store your message. Please email us to get in touch.</Notice><ContactForm/></Panel><aside className="ui-sidebar"><Panel><h2>Help us help you.</h2><div className="ui-prose"><p>For a correction, include the page address and the detail that needs checking.</p><p>For a privacy request, explain which record you mean. Do not send passwords, payment details or sensitive documents.</p><p>For a community story, tell us where it comes from and how we can follow up.</p></div></Panel></aside></div></PageFrame>;
}
