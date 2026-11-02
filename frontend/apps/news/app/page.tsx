import Link from "next/link";
import {
  BusinessIcon,
  Container,
  EmptyState,
  ForumIcon,
  NewsIcon,
  PeopleIcon,
  RadioIcon,
  buttonClassName,
} from "@epelawa/ui";
import Reveal from "../components/reveal";
import HeroArt from "../components/hero-art";
import DownloadApp from "../components/download-app";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import Connectivity from "../components/connectivity";
import { mainNavigation } from "../lib/navigation";
import { siteUrl, isIndexingAllowed } from "../lib/site";

/**
 * EPE LAWA News — home.
 *
 * Latest stories feed. Nothing is connected yet, so every block renders an honest
 * empty state rather than invented headlines, dates, or authors.
 */
export const metadata = {
  title: "Latest Stories — EPE LAWA News",
  description: "The latest reporting from EPE LAWA News. Stories are not connected yet; follow as the publication is built.",
  alternates: { canonical: "/" },
  openGraph: { title: "Latest Stories — EPE LAWA News", type: "website", url: "/", images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA News" }] },
  twitter: { card: "summary_large_image", title: "Latest Stories — EPE LAWA News", images: ["/share.png"] },
  robots: { index: false, follow: false },  // Phase 2: flip on when content publishes
};

export default function Home() {
  return (
    <>
      <SiteHeader items={mainNavigation()} />
      <main id="main" className="site-main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__stack">
            <Reveal className="hero__text">
              <span className="hero__rule" aria-hidden="true" />
              <p className="hero__eyebrow">EPE LAWA News</p>
              <h1 id="hero-title" className="hero__title ep-text-display">
                Reporting from Epe Division
              </h1>
              <p className="hero__lede ep-text-body-lg">
                Local news, conversation and culture for Epe Division, Lagos State — at home
                and abroad.
              </p>
              <div className="hero__actions">
                <DownloadApp className="hero__app" />
                <Link className={buttonClassName("secondary")} href="/about">
                  About the newsroom
                </Link>
              </div>
              <p className="hero__note">
                Stories are not connected yet, so there is nothing to read today. When the
                newsroom publishes, this feed will fill with real reporting — nothing invented.
              </p>
            </Reveal>

            <Reveal className="hero__media" delay={120}>
              <HeroArt />
            </Reveal>
          </div>
        </section>

        <section className="home-block" aria-labelledby="latest-heading">
          <div className="home-block__head">
            <h2 id="latest-heading">Latest stories</h2>
            <p className="home-block__note">The most recent reporting from EPE LAWA News.</p>
          </div>
          <div className="home-block__body">
            <Reveal className="home-block__card" delay={240}>
              <EmptyState icon={<NewsIcon size={20} />}>
                No stories have been published yet.
              </EmptyState>
            </Reveal>
          </div>
        </section>

        <section className="home-block" aria-labelledby="sections-heading">
          <div className="home-block__head">
            <h2 id="sections-heading">Sections</h2>
            <p className="home-block__note">Where our reporting will live.</p>
          </div>
          <div className="home-block__body">
            <Reveal className="home-block__card" delay={240}>
              <EmptyState icon={<RadioIcon size={20} />}>
                No sections are live yet.
              </EmptyState>
            </Reveal>
          </div>
        </section>

        <section className="trust">
          <Reveal className="trust__text" delay={320}>
            <h2 id="trust-heading">How we work</h2>
            <p>
              EPE LAWA News publishes with named sources, dates its corrections and moderates
              against published rules. The{" "}
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
