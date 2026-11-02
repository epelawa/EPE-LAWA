import Link from "next/link";
import { Container, EmptyState, RadioIcon, buttonClassName } from "@epelawa/ui";
import Reveal from "../../../components/reveal";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import Connectivity from "../../../components/connectivity";
import { mainNavigation } from "../../../lib/navigation";
import { siteUrl, isIndexingAllowed } from "../../../lib/site";

/**
 * EPE LAWA News — category page.
 *
 * Lists stories within a category. Nothing is connected yet, so it renders an honest
 * empty state.
 */
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const resolved = await params;
  const slug = Array.isArray(resolved.slug) ? resolved.slug.join("/") : resolved.slug;
  return {
    title: `${slug} — EPE LAWA News`,
    description: `Stories in the ${slug} section of EPE LAWA News. Not connected yet.`,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: `${slug} — EPE LAWA News`, type: "website", url: `/${slug}`, images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA News" }] },
    twitter: { card: "summary_large_image", title: `${slug} — EPE LAWA News`, images: ["/share.png"] },
    robots: { index: false, follow: false },  // Phase 2: flip on when content publishes
  };
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const slug = Array.isArray(resolved.slug) ? resolved.slug.join("/") : resolved.slug;
  return (
    <>
      <SiteHeader items={mainNavigation()} />
      <main id="main" className="site-main" tabIndex={-1}>
        <section className="page-header" aria-labelledby="category-heading">
          <h1 id="category-heading">{slug}</h1>
          <p className="page-header__lede">
            Stories in the {slug} section. Nothing is connected yet, so there is nothing to
            list here.
          </p>
        </section>

        <section className="home-block" aria-labelledby="stories-heading">
          <div className="home-block__head">
            <h2 id="stories-heading">Stories</h2>
            <p className="home-block__note">The latest reporting in {slug}.</p>
          </div>
          <div className="home-block__body">
            <Reveal className="home-block__card" delay={240}>
              <EmptyState icon={<RadioIcon size={20} />}>
                No stories have been published in {slug} yet.
              </EmptyState>
            </Reveal>
          </div>
        </section>

        <section className="trust">
          <Reveal className="trust__text" delay={320}>
            <h2 id="trust-heading">How we work</h2>
            <p>
              Every story in this section will carry a named source, a date and a correction
              notice when something changes. The{" "}
              <Link href="/guidelines">community and editorial guidelines</Link>{" "}
              explain what that means in practice.
            </p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
      <Connectivity />
    </>
  );
}
