import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";
import InformationPage from "../../components/information-page";

import SitePageNote from "../../components/site-page-note";
export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "How EPE LAWA collects, uses, stores and protects personal information under the Nigeria Data Protection Act.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const intake = process.env.ENQUIRY_INTAKE_ENABLED === "true";
  return (
    <InformationPage title="Privacy notice" description="How EPE LAWA collects, uses, stores and protects your personal information.">
      <p className="legal-date"><strong>Last updated:</strong> 26 November 2026</p>

      <SitePageNote page="privacy" label="A note from EPE LAWA" />

      <h2>1. Who we are</h2>
      <p>EPE LAWA is a news and community platform serving Epe Division, Lagos State, Nigeria. We are the controller of personal information processed through this website and decide how and why it is used. This notice explains what we collect, why, how long we keep it, and the choices and rights you have, in line with the Nigeria Data Protection Act 2023 and other applicable Nigerian law.</p>

      <h2>2. Information we collect</h2>
      <h3>2.1 Information you give us directly</h3>
      <p><strong>Member accounts.</strong> When you create an account we collect your email address, password (stored only as a cryptographic hash), display name and handle. Authentication is handled by Supabase.</p>
      <p><strong>Community content.</strong> Comments, forum posts, discussion titles and other material you choose to publish, together with your display name and handle.</p>
      <p><strong>Contributions and submissions.</strong> History, tourism and business contributions you send for review, including any source notes, media and rights information you provide.</p>
      <p><strong>Enquiries.</strong> {intake ? "When you use the contact, advertising, support or correction forms we store your name, email address, phone numbers you choose to share, and your message, privately, for staff review." : "Contact and support forms are currently unavailable, so no message can be submitted through them."} Our acknowledgement emails are best-effort; delivery is not guaranteed.</p>

      <h3>2.2 Information collected automatically</h3>
      <p><strong>Essential cookies and browser storage.</strong> We use essential session cookies so the site can keep you signed in securely, and small browser storage entries to remember your theme choice, the dismissal of the storage notice and the position of the support button. We do not use advertising cookies.</p>
      <p><strong>Plerdy site verification.</strong> We load Plerdy’s asynchronous site script on every page to verify that this website is connected to our Plerdy account. The script may process technical information and page interactions such as clicks to provide Plerdy’s services. Information sent to Plerdy is subject to its own processing practices. We do not use advertising cookies.</p>
      <p><strong>Technical logs.</strong> Our hosting, database and authentication providers (including Vercel and Supabase) may process technical information such as IP address, device and request details needed to serve pages, secure accounts, prevent abuse and investigate failures.</p>

      <h3>2.3 Optional device location</h3>
      <p>The map features ask for your permission before using your device location. If you grant it, coordinates are used only in your browser to search or centre the map; they are not stored by us. Opening directions or an external map takes you to that third party, where their own privacy terms apply.</p>

      <h3>2.4 Uploaded media</h3>
      <p>Images you upload may be resized or compressed before storage, and stored with our third-party storage provider. Do not upload images that contain private information you would not publish.</p>

      <h2>3. Why we process personal information (lawful bases)</h2>
      <p>We process personal information only where we have a lawful basis:</p>
      <ul>
        <li><strong>To provide the service you asked for</strong> — creating and operating your account, publishing content you submit, processing enquiries you send (contract / consent).</li>
        <li><strong>Legitimate interests</strong> — keeping the platform secure, preventing abuse, fraud and spam, moderation, debugging, maintaining service stability and verifying our website connection to Plerdy.</li>
        <li><strong>Legal obligations</strong> — keeping records where required by Nigerian law and responding to lawful requests from authorities.</li>
        <li><strong>Consent</strong> — newsletters you explicitly confirm, and optional features that require a browser permission such as location.</li>
      </ul>

      <h2>4. Who we share information with</h2>
      <p>We do not sell personal information. We share it only with:</p>
      <ul>
        <li><strong>Service providers</strong> who help us operate the platform: hosting (Vercel), authentication and database (Supabase), media storage (Cloudflare), and email delivery providers for account, acknowledgement and newsletter emails. They process information on our instructions.</li>
        <li><strong>Plerdy</strong> receives information through its site script for website verification and its configured site services.</li>
        <li><strong>Authorised staff</strong> who review submissions, contributions and enquiries.</li>
        <li><strong>Authorities</strong> where the law requires or permits it, such as to respond to a valid legal request, or to protect someone's safety.</li>
      </ul>

      <h2>5. International transfers</h2>
      <p>Our service providers may store or process information outside Nigeria, including in the United States and European Union. Where that happens, we rely on the safeguards those providers put in place (such as standard contractual clauses) and keep transfers limited to what is necessary to run the service.</p>

      <h2>6. How long we keep information</h2>
      <p>Account information is kept while your account is active, and for a short period afterwards to allow recovery or to satisfy record-keeping needs. Content you publish remains published until you or our moderators remove it, after which limited records may be retained for moderation, security and audit purposes. Enquiries and submissions are kept while needed to handle them and to keep an auditable record of editorial decisions. Because retention varies by purpose, a single fixed period is not stated here; specific periods may be published later.</p>

      <h2>7. Your rights</h2>
      <p>Subject to applicable law, you have the right to:</p>
      <ul>
        <li>ask whether we hold personal information about you and get a copy of it;</li>
        <li>ask us to correct information that is inaccurate or incomplete;</li>
        <li>ask us to delete your personal information or your account;</li>
        <li>object to or ask us to restrict certain processing;</li>
        <li>withdraw consent where processing is based on consent, such as unsubscribing from the newsletter at any time; and</li>
        <li>lodge a complaint with the Nigeria Data Protection Commission.</li>
      </ul>
      <p>To exercise a right, use the <Link href="/contact">Contact page</Link>, which shows whether the enquiry channel is currently open. We review every request; submission does not guarantee a particular outcome, and we may decline requests the law does not require us to honour.</p>

      <h2>8. How we protect information</h2>
      <p>We apply measures appropriate to the risk, including encrypted connections (HTTPS), access limited to authorised staff, capability-gated and audited staff actions, and restrictions within our database so private material is not publicly readable. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

      <h2>9. Public areas</h2>
      <p>Your display name, handle and the content you choose to post in public areas will be visible to other visitors and may be indexed by search engines. Do not put sensitive personal information in a public profile, comment or forum post.</p>

      <h2>10. Children</h2>
      <p>This site is not directed at children under 13, and we do not knowingly collect personal information from children. If you believe a child has given us personal information, contact us through the <Link href="/contact">Contact page</Link> and we will act on it. Do not share a child's private information in public areas.</p>

      <h2>11. Changes to this notice</h2>
      <p>Changes will be published on this page with a new "last updated" date. Continued use of the site after a change takes effect means you accept the updated notice.</p>

      <h2>12. Contacting us</h2>
      <p>The <Link href="/contact">Contact page</Link> shows current enquiry availability. For data-protection questions, choose the contact or support option and describe your request; it goes privately to authorised staff.</p>
    </InformationPage>
  );
}
