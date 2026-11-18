import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/enquiry-form";
import { PageFrame, PageIntro, Panel } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
export const metadata: Metadata = pageMetadata({title:"Support",description:"Get help with EPE LAWA.",path:"/support"});
export default function SupportPage() {
 return <PageFrame className="ui-stack"><PageIntro eyebrow="Support" title="How can we help?" description="Tell us what happened and our team will get back to you."/><Panel className="ui-stack">{process.env.ENQUIRY_INTAKE_ENABLED === "true" ? <><p>After your request is saved, you’ll receive a ticket number on this page. Keep it when contacting us again. Please do not include passwords, payment information or other sensitive details.</p><EnquiryForm kind="support" /></> : <p role="status">Support requests are temporarily unavailable. Please check back later; no request can be submitted now.</p>}<p>For other enquiries, visit <Link href="/contact">Contact</Link>.</p></Panel></PageFrame>;
}
