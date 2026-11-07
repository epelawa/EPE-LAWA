import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";

const description =
  "About EPE LAWA, a web platform for Epe Division featuring news, community history, discussion, maps, local businesses, tourism, radio and Who is Who.";

export const metadata: Metadata = pageMetadata({ title: "About", description, path: "/about" });

export default function AboutPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="prose">
        <p className="page-header__eyebrow text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          About EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-4">About EPE LAWA</h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          A web platform for people in Epe Division, Lagos State, and those connected to the community.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">What EPE LAWA is</h2>
        <p className="mb-6">
          EPE LAWA brings together local news, Itan Ilu Mi community history, the Digital Village Square,
          map and navigation links, and an Epe business directory and marketplace. Information and
          listings are published only when approved; availability of individual features may vary.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Who runs it</h2>
        <p className="mb-6">
          EPE LAWA is run by its founding team. Editorial staff details will appear here once confirmed.
        </p>

        <h2 className="mt-10 mb-3 text-lg font-bold">Contact</h2>
        <p className="mb-4">
          Write to{" "}
          <a href="mailto:info.epelawa@gmail.com" className="text-primary underline underline-offset-4">
            info.epelawa@gmail.com
          </a>, or use the{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            contact page
          </Link>. Corrections and privacy requests go to the same address.
        </p>
        <p>
          <Link href="/" className="text-primary underline underline-offset-4">
            Return to the homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
