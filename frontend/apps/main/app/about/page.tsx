import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";

const description =
  "What EPE LAWA is, who runs it, where it broadcasts and how it is funded.";

export const metadata: Metadata = pageMetadata({ title: "About", description, path: "/about" });

export default function AboutPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="prose">
        <h2 className="page-header__eyebrow text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          About EPE LAWA
        </h2>
        <h1 className="text-2xl font-bold tracking-tight mb-4">About EPE LAWA</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          A community, news and broadcasting platform for Epe Division, Lagos State, at home and
          abroad.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">What EPE LAWA is</h2>
        <p className="mb-6">
          EPE LAWA is being built as one place for reporting, public information about people and
          public office holders, radio, community conversation and local businesses in Epe
          Division. It is intended for people living in the division and for people connected to
          it from elsewhere.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Who runs it</h2>
        <p className="mb-6">
          EPE LAWA is run by its founding team. The editorial staff, their roles, and who may
          approve or publish a story have not been published yet. Those details will appear here
          once they are confirmed.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Where it broadcasts</h2>
        <p className="mb-6">
          EPE LAWA produces a radio programme on Radio Lagos 107.5 FM Àmitítí. That is a station
          broadcast. Playing it in a browser is a separate thing, and it needs three things this
          project does not have yet: the stream address, its format, and permission to embed it.
        </p>
        <p className="mb-6">
          So the web player is not connected yet. There is nothing to listen to on this site
          today, and the site does not pretend otherwise.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">How it is funded</h2>
        <p className="mb-6">
          No funding arrangement has been agreed and published. EPE LAWA does not charge for
          publication, and no paid placement or sponsorship is live. If a funding arrangement is
          agreed, it will be stated on this page before it takes effect.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">What is not connected yet</h2>
        <p className="mb-6">
          News, radio, the Who is Who directory, the forum, member accounts and the business
          directory are all not connected yet. The pages that exist today are the ones linked in
          the header and footer. Nothing else is advertised.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Contact</h2>
        <p className="mb-4">
          Write to{" "}
          <a href="mailto:info.epelawa@gmail.com" className="text-blue-600 underline underline-offset-4">
            info.epelawa@gmail.com
          </a>{" "}
          , or use the <Link href="/contact" className="text-blue-600 underline underline-offset-4">contact page</Link>. Corrections and privacy requests go to the same address.
        </p>
        <p>
          <Link href="/" className="text-blue-600 underline underline-offset-4">
            Return to the homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
