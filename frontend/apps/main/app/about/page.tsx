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
          A community, news and broadcasting platform for Epe Division, Lagos State.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">What EPE LAWA is</h2>
        <p className="mb-6">
          EPE LAWA is a place for reporting, public information about people and public office
          holders, radio, community conversation and local businesses in Epe Division.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Who runs it</h2>
        <p className="mb-6">
          EPE LAWA is run by its founding team. Editorial staff details will appear here once
          confirmed.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Contact</h2>
        <p className="mb-4">
          Write to{" "}
          <a href="mailto:info.epelawa@gmail.com" className="text-blue-600 underline underline-offset-4">
            info.epelawa@gmail.com
          </a>, or use the{" "}
          <Link href="/contact" className="text-blue-600 underline underline-offset-4">
            contact page
          </Link>. Corrections and privacy requests go to the same address.
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
