import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";
import InformationPage from "../../components/information-page";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description: "How EPE LAWA handles account, contribution and service information, and current limits on contacting the team.", path: "/privacy" });

export default function PrivacyPage() {
  return <InformationPage title="Privacy notice" description="What you share, what stays private, and the current limits on privacy requests.">
    <h2>Reading the public site</h2><p>You can browse public pages without a member account. Your theme choice and the dismissal of the storage notice are saved in your browser. No optional analytics tool, advertising pixel or social tracking script is enabled.</p>
    <h2>Member accounts and session cookies</h2><p>Creating an account uses your email address, password, display name and handle. Authentication is handled by Supabase. Signing in uses essential session cookies so the site can recognise your session. Your password is not published.</p><p>Your display name, handle and the content you choose to post may be visible in community areas. Do not put sensitive personal information in a public profile, comment or forum post.</p>
    <h2>Contributions and private information</h2><p>History, tourism and business contributions are reviewed before publication. Private source notes, consent evidence and staff review information are not intended for public display. History publication uses a separately reviewed public account rather than automatically publishing private submissions.</p><p>Marketplace order requests may include contact and fulfilment information. Those details are restricted to the relevant members and authorised staff. Online payment is not currently connected.</p>
    <h2>Maps and external services</h2><p>Location access is optional. The map asks for permission before using your device location. Opening directions takes you to Google Maps, where that service’s own privacy terms apply.</p><p>The platform uses hosting and database/authentication providers to operate the service. These providers may process technical information needed to serve pages, secure accounts and investigate failures.</p>
    <h2>Contacting the team</h2><p>No public contact address or connected private-message service is currently configured. The Contact page describes this limitation; nothing entered on that page is sent or recorded.</p>
    <h2>Retention, corrections and deletion</h2><p>The site does not currently provide a working private request channel for access, correction or deletion requests. Do not assume that visiting the Contact page or posting publicly records a request. Never include a password or payment details in a public post.</p>
    <h2>Children</h2><p>This site is not directed at children under 13. Avoid posting a child’s personal information publicly; the site currently has no private request channel for reporting or removal requests.</p>
    <h2>Changes and questions</h2><p>Changes to this notice will be published here. The <Link href="/contact">Contact page</Link> shows whether a public submission channel is available; currently, it is not.</p>
  </InformationPage>;
}
