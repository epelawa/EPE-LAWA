import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "EPE LAWA editorial standards, community history consent, business verification, and Digital Village Square rules.";

export const metadata: Metadata = pageMetadata({
  title: "Guidelines",
  description,
  path: "/guidelines",
});

export default function GuidelinesPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Community and editorial guidelines</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          How EPE LAWA handles news and community history, what business verification means, and how
          members are expected to treat one another in the Digital Village Square.
        </p>
      </div>

      <div className="prose">
        <h2 className="mt-8 mb-3 text-lg font-bold">Editorial standards</h2>
        <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
          <li>Published reporting identifies its sources; an unnamed source is explained to readers.</li>
          <li>A claim that has not been checked is attributed as a claim, not presented as fact.</li>
          <li>Corrections are dated and made visible with the story they correct.</li>
          <li>Comment and opinion are labelled as such.</li>
          <li>Any paid placement, if introduced, is clearly labelled and is not presented as reporting.</li>
        </ul>

        <h2 id="verification" className="mt-8 mb-3 text-lg font-bold">Business verification</h2>
        <p className="mb-6">
          A verification mark on a business listing means an EPE LAWA reviewer recorded what business
          information was checked, who checked it, and when. It is not an endorsement, guarantee of
          service quality, or promise that details will never change.
        </p>
        <p className="mb-6">
          If a business detail or verification mark appears wrong, send us the listing address and
          supporting information so it can be reviewed.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Community history contributions</h2>
        <p className="mb-6">
          Community history submissions remain private while they are reviewed. Contributors should
          provide provenance and confirm they have permission to share the information and media.
          Sensitive family details are not published by default. Corrections and removal requests are
          reviewed with the record’s context and an audit trail.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Digital Village Square rules</h2>
        <p className="mb-6">Disagreement is welcome. The following is not:</p>
        <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
          <li>Threats, harassment, or targeting someone&apos;s family.</li>
          <li>Hate speech about ethnicity, religion, gender, disability or origin.</li>
          <li>Impersonating another person, business or member of staff.</li>
          <li>Publishing someone&apos;s private information, including an address or phone number.</li>
          <li>Claims presented as fact that the poster knows are false.</li>
          <li>Spam, scams, or the sale of illegal goods and services.</li>
          <li>Sexual content involving minors, in any form.</li>
        </ul>

        <h2 className="mt-10 mb-3 text-lg font-bold">Moderation</h2>
        <p className="mb-6">
          A moderator may hide or otherwise restrict content under these rules. Actions require a
          recorded reason and are audited. A hidden post may leave a marker so surrounding discussion
          remains understandable. Repeated or serious breaches may lead to a posting restriction.
        </p>
        <p className="mb-6">Moderation is not a way to remove an opinion solely because someone disagrees with it.</p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Corrections and reports</h2>
        <p className="mb-6">
          Send a correction or moderation report to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>, or use the{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            contact page
          </Link>. Include the page address and, where relevant, the source. Reports are read by a person.
        </p>
      </div>
    </div>
  );
}
