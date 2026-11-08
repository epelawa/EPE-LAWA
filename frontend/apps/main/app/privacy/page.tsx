import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";
import InformationPage from "../../components/information-page";
export const metadata: Metadata = pageMetadata({ title: "Privacy", description: "How EPE LAWA handles account, contribution and service information, and how to ask for a correction or deletion.", path: "/privacy" });
export default function PrivacyPage() {
  return <InformationPage title="Privacy notice" description="What you share, what stays private, and how to ask about your information.">
    <h2>Reading the public site</h2><p>You can browse public pages without a member account. Your theme choice and the dismissal of the storage notice are saved in your browser. No optional analytics tool, advertising pixel or social tracking script is enabled.</p>
    <h2>Member accounts and session cookies</h2><p>Creating an account uses your email address, password, display name and handle. Authentication is handled by Supabase. Signing in uses essential session cookies so the site can recognise your session. Your password is not published.</p><p>Your display name, handle and the content you choose to post may be visible in community areas. Do not put sensitive personal information in a public profile, comment or forum post.</p>
    <h2>Contributions and private information</h2><p>History, tourism and business contributions are reviewed before publication. Private source notes, consent evidence and staff review information are not intended for public display. History publication uses a separately reviewed public account rather than automatically publishing private submissions.</p><p>Marketplace order requests may include contact and fulfilment information. Those details are restricted to the relevant members and authorised staff. Online payment is not currently connected.</p>
    <h2>Maps and external services</h2><p>Location access is optional. The map asks for permission before using your device location. Opening directions takes you to Google Maps, where that service’s own privacy terms apply.</p><p>The platform uses hosting and database/authentication providers to operate the service. These providers may process technical information needed to serve pages, secure accounts and investigate failures.</p>
    <h2>Contacting the team</h2><p>Email messages are used to handle your request. The website’s contact-form delivery is not connected yet; checking a draft does not deliver or store that message. Use <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to contact the team.</p>
    <h2>Retention, corrections and deletion</h2><p>Information is kept for the purpose it was provided, subject to account, moderation, security and record-keeping needs. There is no fixed retention period published yet. Ask the team what is held about you, request a correction, or request deletion at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include the relevant page or account handle, not your password.</p>
    <h2>Children</h2><p>This site is not directed at children under 13. If you believe a child’s personal information has been shared here, contact the team so it can be reviewed.</p>
    <h2>Changes and questions</h2><p>Changes to this notice will be published on this page. Questions and privacy requests can also start from the <Link href="/contact">contact page</Link>.</p>
  </InformationPage>;
}
