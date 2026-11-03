"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import ThemeToggle from "../components/theme-toggle";
import DownloadAppButton from "../components/download-app-button";
import {
  NewspaperIcon,
  UsersIcon,
  RadioIcon,
  MessageCircleIcon,
  BuildingIcon,
  ImageIcon,
  ChevronRightIcon,
} from "../components/icons";

/**
 * Landing page.
 *
 * Sleek, professional design inspired by modern product sites (sckooly.app,
 * getquant.app). Clean whitespace, rounded everything, blue/emerald/white/black
 * palette. No fake statistics, no fabricated testimonials, no invented metrics.
 * Every section is either a real destination or an honest empty state.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <ThemeToggle />

      {/* Hero */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6">
              EPE LAWA · Epe Division
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
              The Voice of Epe Division
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              News, conversation, radio and local businesses for Epe Division,
              Lagos State — at home and abroad.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/news" className="btn-primary flex-1 sm:auto">
                Read the news
              </Link>
              <DownloadAppButton />
              <Link href="/about" className="btn-ghost flex-1 sm:auto">
                About EPE LAWA
              </Link>
            </div>
          </div>

          {/* Honest state note */}
          <p className="text-center mt-8 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            The news publication and online stream are not connected yet, so
            there is no published story or live stream to open today.
          </p>
        </div>
      </section>

      {/* Sections grid */}
      <section className="py-20 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SectionCard
              icon={<NewspaperIcon size={24} className="text-slate-600" />}
              title="News"
              description="Reporting from Epe Division."
              state="No stories have been published yet."
              href="/news"
            />
            <SectionCard
              icon={<UsersIcon size={24} className="text-slate-600" />}
              title="Who is Who"
              description="People and public office holders in Epe Division."
              state="No profiles have been published yet."
              href="/guidelines#verification"
              stateLabel="What verification means here"
            />
            <SectionCard
              icon={<RadioIcon size={24} className="text-slate-600" />}
              title="Radio"
              description="Radio Lagos 107.5 FM."
              state="Not live right now."
              href="/radio"
              stateLabel="Open the radio page"
            />
            <SectionCard
              icon={<MessageCircleIcon size={24} className="text-slate-600" />}
              title="Forum"
              description="Conversations between people of Epe Division."
              state="No conversations have been started yet."
              href="/guidelines"
              stateLabel="Read the community guidelines"
            />
            <SectionCard
              icon={<BuildingIcon size={24} className="text-slate-600" />}
              title="Businesses"
              description="Businesses serving Epe Division."
              state="No businesses have been listed yet."
            />
            <SectionCard
              icon={<ImageIcon size={24} className="text-slate-600" />}
              title="Gallery"
              description="Photographs from across Epe Division."
              state="No photographs have been published yet."
            />
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">How we work</h2>
          <p className="text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            EPE LAWA publishes with named sources, dates its corrections and
            moderates against published rules.
          </p>
          <Link href="/guidelines" className="text-sm font-medium text-blue-600 hover:underline">
            Community and editorial guidelines →
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  state,
  href,
  stateLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: string;
  href?: string;
  stateLabel?: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4">{description}</p>
      <p className="text-sm font-medium text-slate-500 mb-4">{state}</p>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          {stateLabel || "View"} <ChevronRightIcon size={14} />
        </Link>
      ) : null}
    </div>
  );
}
