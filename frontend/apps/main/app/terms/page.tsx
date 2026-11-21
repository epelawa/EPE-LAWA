import InformationPage from "../../components/information-page";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";

const description = "The agreement between you and EPE LAWA for using this platform.";

export const metadata: Metadata = pageMetadata({ title: "Terms", description, path: "/terms" });

export default function TermsPage() {
  return (
    <InformationPage title="Terms of use" description="The agreement between you and EPE LAWA for using this platform.">
      <p className="legal-date"><strong>Last updated:</strong> 12 November 2026</p>

      <h2>1. Agreement</h2>
      <p>These terms are an agreement between you and EPE LAWA ("we", "us") covering your use of this website, its mobile-equivalent web app and any related services we provide through it ("the service"). By using the service, creating an account, or submitting content, you accept these terms. If you do not accept them, do not use the service. Our <Link href="/privacy">Privacy notice</Link> explains how personal information is handled and forms part of these terms.</p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 13 years old to create an account. If you are under 18, use the service only with a parent's or guardian's consent and supervision.</p>

      <h2>3. Accounts</h2>
      <h3>3.1 Your responsibilities</h3>
      <p>You are responsible for keeping your password confidential and for all activity under your account. Give accurate information when creating an account, and one account per person unless we say otherwise. Do not impersonate any person or organisation, or use a name or handle you have no right to use.</p>
      <h3>3.2 Suspension and termination</h3>
      <p>We may suspend or end an account, or remove content, if you break these terms, if the law requires it, or to protect the service, our community or other people. Where practical and appropriate, we will tell you why. You may stop using the service at any time.</p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service for unlawful, fraudulent, harmful, defamatory, threatening, hateful, discriminatory, harassing or obscene purposes;</li>
        <li>post content you have no right to share, including other people's private information, copyrighted work without permission, or false statements presented as fact;</li>
        <li>attack, probe or disrupt the service, bypass access controls or security measures, or try to reach areas that are not public;</li>
        <li>overload the service deliberately (including automated scraping, denial-of-service or bulk automated requests without our written permission);</li>
        <li>misrepresent material published here as your own, or republish a whole piece from this site without permission; or</li>
        <li>use the service to send spam or to advertise without our permission.</li>
      </ul>

      <h2>5. Content you submit</h2>
      <h3>5.1 Ownership and licence</h3>
      <p>You keep ownership of the content you create and submit. By submitting it, you grant EPE LAWA a worldwide, royalty-free, transferable licence to store, review, edit, publish, adapt and display it as part of operating and promoting the service, and to keep archival copies. This licence ends for material you successfully retract, except for copies already published, stored for moderation or audit, or shared under the terms that applied when it was public.</p>
      <h3>5.2 Your responsibility</h3>
      <p>You are responsible for what you submit. You promise that what you submit is yours or that you have permission to share it, that it does not break any law or anyone's rights, and that any statement of fact you present as verified is accurate to the best of your knowledge.</p>
      <h3>5.3 Review and moderation</h3>
      <p>Contributions such as history, tourism and business submissions are reviewed before publication; submission is not approval. We may edit, decline or remove any content at our discretion, and we may record the decision in an internal audit log.</p>

      <h2>6. Our content</h2>
      <p>Text, photographs and other material published here belong to EPE LAWA or the person credited. You may read, quote fairly and link to anything public, with attribution and a link back. Republishing a whole piece, or using content commercially, needs permission. The EPE LAWA name, logo and site design may not be used without permission.</p>

      <h2>7. Information and accuracy — no professional advice</h2>
      <p>We aim to report accurately, attribute sources and correct mistakes openly, but we do not promise that content is complete, current or fit for any particular purpose. Business listings, tourism records, map features and community content are provided for information only; verify current arrangements directly before relying on them. Nothing on this site is legal, medical, financial or other professional advice, and you should not act on it as if it were.</p>
      <p>External links, embedded maps and third-party services (including Google Maps and OpenStreetMap) are provided for convenience. We do not endorse and are not responsible for third-party content, availability or practices, which are governed by that third party's own terms.</p>

      <h2>8. Marketplace and business listings</h2>
      <p>Business listings describe third-party businesses, and order or contact requests simply relay your message to them. We do not own, operate, endorse or guarantee any listed business, product or service, are not a party to any transaction between you and them, and accept no responsibility for the quality, safety, legality or delivery of anything they offer. Online payment for marketplace orders is not currently connected; arrange any payment directly with the business at your own risk.</p>

      <h2>9. Availability and changes</h2>
      <p>The service is provided as it is. It may be unavailable while it is improved, maintained or paused, and we may change, suspend or discontinue any part of it at any time. Features described but not yet connected are not a promise of a date. We may also update these terms; the current version is always on this page, and significant changes take effect when published. Continuing to use the service after that means you accept the updated terms.</p>

      <h2>10. Disclaimers</h2>
      <p>To the fullest extent permitted by law, the service and all content are provided "as is" and "as available" without warranties or conditions of any kind, express or implied, including warranties of accuracy, merchantability, fitness for a particular purpose and non-infringement. We do not warrant that the service will be uninterrupted, secure or error-free, or that defects will be corrected.</p>

      <h2>11. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, EPE LAWA and its team will not be liable to you for any indirect, incidental, special, consequential or punitive loss, or for any loss of profit, data, goodwill, business or opportunity, arising from or connected to your use of (or inability to use) the service or its content. To the fullest extent permitted by law, our total liability to you for all claims arising from the service is limited to zero, because the service is provided free of charge; where this is not permitted, liability is limited to the maximum amount allowed by law.</p>
      <p>Nothing in these terms excludes or limits liability that cannot be excluded or limited under Nigerian law, and nothing here limits rights you have under mandatory consumer-protection law.</p>

      <h2>12. Indemnity</h2>
      <p>You agree to compensate us (including reasonable legal costs) for any claim, loss or damage we suffer arising from content you submit, your breach of these terms, or your misuse of the service, except to the extent caused by us.</p>

      <h2>13. Governing law and disputes</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria. The courts of Lagos State, Nigeria have exclusive jurisdiction over any dispute arising from these terms or the service. Before starting a court case, please try to resolve the matter with us first through the <Link href="/contact">Contact page</Link>.</p>

      <h2>14. General</h2>
      <p>If any part of these terms is found unenforceable, the rest stays in force. If we delay enforcing a right, we do not lose it. These terms, together with the <Link href="/privacy">Privacy notice</Link> and our <Link href="/guidelines">Community guidelines</Link>, are the entire agreement between you and us about the service.</p>

      <h2>15. Contact</h2>
      <p>Questions about these terms: the <Link href="/contact">Contact page</Link> shows the current enquiry channel and its availability.</p>
    </InformationPage>
  );
}
