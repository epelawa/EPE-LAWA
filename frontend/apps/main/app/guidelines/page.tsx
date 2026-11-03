import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

const description =
  "Editorial standards, what a verified badge means on EPE LAWA, and the rules for comments and the forum.";

export const metadata: Metadata = pageMetadata({
  title: "Guidelines",
  description,
  path: "/guidelines",
});

export default function GuidelinesPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Community and editorial guidelines</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">
          How EPE LAWA reports, what a verified badge claims, and how people are expected to treat
          each other here.
        </p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-8">
        <h3 className="font-semibold text-red-900 mb-2">Comments and the forum are not connected yet</h3>
        <p className="text-red-800 text-sm">
          These rules are published before those features open, so nobody has to agree to
          something they could not read first. They apply to anything published on EPE LAWA.
        </p>
      </div>

      <div className="prose">
        <h2 className="mt-8 mb-3 text-lg font-bold">Editorial standards</h2>
        <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
          <li>Every published story names its sources. An unnamed source is explained to readers.</li>
          <li>
            A claim that has not been checked is written as a claim, not as a fact, and it says who made it.
          </li>
          <li>Corrections are dated and placed at the top of the story they correct.</li>
          <li>Comment and opinion are labelled as comment and opinion.</li>
          <li>
            Paid placement, if it is ever introduced, will be labelled as paid placement. It will not be dressed as reporting.
          </li>
        </ul>

        <h2 id="verification" className="mt-8 mb-3 text-lg font-bold">What verification means here</h2>
        <p className="mb-6">
          A verified badge next to a name on Who is Who means one thing: a person at EPE LAWA
          checked a recorded source and wrote down what was checked, who checked it, and when.
        </p>
        <p className="mb-6">It does not mean any of the following:</p>
        <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
          <li>That EPE LAWA endorses the person, their politics or their record.</li>
          <li>That the profile is complete, or that nothing in it will ever change.</li>
          <li>That the person speaks for EPE LAWA.</li>
        </ul>
        <p className="mb-6">
          No profile is published without at least one recorded source. If you believe a badge is
          wrong, or that a listed office or term is incorrect, tell us with the source and it will
          be checked again.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Comment and forum rules</h2>
        <p className="mb-6">
          Disagreement is welcome. The following is not:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
          <li>Threats, harassment, or targeting someone&apos;s family.</li>
          <li>Hate speech about ethnicity, religion, gender, disability or origin.</li>
          <li>Impersonating a person, an office holder or a member of staff.</li>
          <li>
            Publishing someone&apos;s private information, including an address or a phone number.
          </li>
          <li>Claims presented as fact that the poster knows are false.</li>
          <li>Spam, scams, or the sale of illegal goods and services.</li>
          <li>Sexual content involving minors, in any form.</li>
        </ul>

        <h2 className="mt-10 mb-3 text-lg font-bold">Moderation</h2>
        <p className="mb-6">
          A moderator may hide a post. When they do, the reason is recorded and the action is
          logged. A hidden post leaves a marker so the replies around it still make sense. Repeated
          or serious breaches may lead to a posting ban.
        </p>
        <p className="mb-6">
          Moderation is not a way to remove an opinion someone disagrees with. It applies to the
          rules above.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Corrections and reports</h2>
        <p className="mb-6">
          Send a correction or a moderation report to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>, or use the{" "}
          <Link href="/contact" className="text-blue-600 underline underline-offset-4">
            contact page
          </Link>. Include the page address and, where relevant, the source. Reports are read by a person.
        </p>
      </div>
    </div>
  );
}
