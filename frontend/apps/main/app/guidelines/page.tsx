import InformationPage from "../../components/information-page";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";

import SitePageNote from "../../components/site-page-note";
const description =
  "EPE LAWA editorial standards, community history consent, business verification, and Digital Village Square rules.";

export const metadata: Metadata = pageMetadata({
  title: "Guidelines",
  description,
  path: "/guidelines",
});

export default function GuidelinesPage() {
  return (
    <InformationPage title="Community and editorial guidelines" description="How we report, share community history, verify business information and treat one another.">
      <SitePageNote page="guidelines" label="A note from EPE LAWA" />

      <h2>Editorial standards</h2>
      <ul>
        <li>Published reporting identifies its sources; an unnamed source is explained to readers.</li>
        <li>A claim that has not been checked is attributed as a claim, not presented as fact.</li>
        <li>Corrections are dated and made visible with the story they correct.</li>
        <li>Comment and opinion are labelled as such.</li>
        <li>Any paid placement, if introduced, is clearly labelled and is not presented as reporting.</li>
      </ul>

      <h2 id="ai">How we use AI</h2>
      <ul>
        <li>Stories written by our AI assistant are marked as written by the EPE LAWA AI desk and are rewritten in our own words from several public reports — never copied.</li>
        <li>An AI story may only state figures and quotes that appear in its source reports. Anything it cannot support is saved as a draft for an editor instead of being published.</li>
        <li>AI stories never carry another outlet&apos;s logo or branding. Their cover is a picture from a report, a freely licensed photo, or a clearly AI-generated illustration; when none is suitable we show our own fallback image.</li>
        <li>The assistant answers simple enquiries and support tickets, labelled as AI replies. Corrections, complaints, legal, privacy, payment and safety matters always go to a person.</li>
        <li>The assistant may hide spam or abusive comments with a stated reason. Staff review its actions and can restore anything it got wrong.</li>
      </ul>

      <h2 id="verification">Business verification</h2>
      <p>
        A verification mark on a business listing means an EPE LAWA reviewer recorded what business
        information was checked, who checked it, and when. It is not an endorsement, guarantee of
        service quality, or promise that details will never change.
      </p>
      <p>
        The site does not currently accept correction reports for business details or verification
        marks. A secure report channel is coming soon; do not post private information publicly.
      </p>

      <h2>Community history contributions</h2>
      <p>
        Community history submissions remain private while they are reviewed. Contributors should
        provide provenance and confirm they have permission to share the information and media.
        Sensitive family details are not published by default. A correction or removal-request channel
        is not currently available, so do not assume a published record can be changed through the
        Contact page.
      </p>

      <h2>Digital Village Square rules</h2>
      <p>Disagreement is welcome. The following is not:</p>
      <ul>
        <li>Threats, harassment, or targeting someone&apos;s family.</li>
        <li>Hate speech about ethnicity, religion, gender, disability or origin.</li>
        <li>Impersonating another person, business or member of staff.</li>
        <li>Publishing someone&apos;s private information, including an address or phone number.</li>
        <li>Claims presented as fact that the poster knows are false.</li>
        <li>Spam, scams, or the sale of illegal goods and services.</li>
        <li>Sexual content involving minors, in any form.</li>
      </ul>

      <h2>Moderation</h2>
      <p>
        A moderator may hide or otherwise restrict content under these rules. Actions require a
        recorded reason and are audited. A hidden post may leave a marker so surrounding discussion
        remains understandable. Repeated or serious breaches may lead to a posting restriction.
      </p>
      <p>Moderation is not a way to remove an opinion solely because someone disagrees with it.</p>

      <h2>Corrections and reports</h2>
      <p>
        General correction and page-level report intake is currently unavailable. The Contact page
        shows the current status but does not receive or store messages. Please do not include private
        information in public posts while a secure channel is being configured. <Link href="/contact">Check contact availability</Link>.
      </p>
    </InformationPage>
  );
}
