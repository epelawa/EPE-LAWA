import Link from "next/link";
import {
  Container,
  EmptyState,
  PeopleIcon,
  RadioIcon,
  buttonClassName,
} from "@epelawa/ui";
import Reveal from "../../../components/reveal";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import Connectivity from "../../../components/connectivity";
import { mainNavigation } from "../../../lib/navigation";
import { siteUrl, isIndexingAllowed } from "../../../lib/site";

/**
 * EPE LAWA News — article page.
 *
 * Editorial article layout: serif headline, byline, publication date, hero image,
 * prose body, correction notice, share, tags. Nothing is connected yet, so this
 * renders an honest empty state rather than invented copy.
 */
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const resolved = await params;
  const slug = Array.isArray(resolved.slug) ? resolved.slug.join("/") : resolved.slug;
  return {
    title: `${slug} — EPE LAWA News`,
    description: `An article from EPE LAWA News. Not connected yet.`,
    alternates: { canonical: `/article/${slug}` },
    openGraph: { title: `${slug} — EPE LAWA News`, type: "article", url: `/article/${slug}`, images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA News" }] },
    twitter: { card: "summary_large_image", title: `${slug} — EPE LAWA News`, images: ["/share.png"] },
    robots: { index: false, follow: false },  // Phase 2: flip on when content publishes
  };
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const slug = Array.isArray(resolved.slug) ? resolved.slug.join("/") : resolved.slug;
  return (
    <>
      <SiteHeader items={mainNavigation()} />
      <main id="main" className="site-main" tabIndex={-1}>
        <section className="page-header" aria-labelledby="article-heading">
          <div className="article-meta">
            <span className="article-section">EPE LAWA News</span>
            <time className="article-date">Not connected yet</time>
          </div>
          <h1 id="article-heading" className="article-title">
            {slug.replace(/-/g, " ")}
          </h1>
          <p className="article-dek">
            This article is not connected yet — there is no body to read.
          </p>
        </section>

        <section className="article-body" aria-labelledby="article-heading">
          <div className="prose">
            <Reveal className="article-empty" delay={240}>
              <EmptyState icon={<PeopleIcon size={24} />}>
                No article body has been published yet.
              </EmptyState>
            </Reveal>
          </div>

          <div className="article-footer">
            <Reveal className="article-tags" delay={320}>
              <p className="article-tags__label">Tags</p>
              <span className="article-tags__list">No tags yet</span>
            </Reveal>

            <Reveal className="article-share" delay={320}>
              <p className="article-share__label">Share this story</p>
              <div className="article-share__buttons">
                <button className="ep-btn ep-btn--ghost ep-btn__share">
                  WhatsApp
                </button>
                <button className="ep-btn ep-btn--ghost ep-btn__share">
                  Copy link
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="trust">
          <Reveal className="trust__text" delay={400}>
            <h2 id="trust-heading">How we work</h2>
            <p>
              Every article on EPE LAWA News carries a named source, a publication date and a
              dated correction notice when something changes. Nothing here is invented — if a
              story isn&rsquo;t connected, this page says so instead of filling the gap.
            </p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
      <Connectivity />
    </>
  );
}
