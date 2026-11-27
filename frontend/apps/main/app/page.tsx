import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, UsersIcon, ListenShortcutIcon, CompassIcon, BuildingIcon, MessageCircleIcon, CalendarShortcutIcon, RoadIcon, MapPinIcon } from "../components/icons";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories, getHomeBreakingStories, type LatestStory, type HomeBreakingStory, type PublicListResult } from "../lib/home-data";
import "./hero-logo.css";
import "./connection-panel.css";
import "./home-client-refresh.css";
import CookieBanner from "../components/cookie-banner";
import HeroCarousel from "../components/hero-carousel";
import NewsImage from "../components/news-image";
import ArticleByline from "../components/article-byline";
import StoryStats from "../components/story-stats";
import { HomeBreakingTicker } from "../components/home-breaking-ticker";
import { BreakingBadge } from "../components/breaking-news";
import { HomeSectionReveal } from "../components/home-sections";
import SitePoll from "../components/site-poll";
import HomeLivePill from "../components/home-live-pill";
import { t, type SiteLanguage } from "../lib/i18n";
import StructuredData from "../components/structured-data";
import { AdvertiseCallout } from "../components/sponsor-slot";
import { organizationSchema, websiteSchema } from "../lib/structured-data";

// The homepage component does not await anything before rendering the hero. readSiteLanguage()
// always resolves "en" while full Yoruba is unavailable, so awaiting it only added a suspension
// point in front of the hero. If Yoruba is re-enabled, read the language without suspending the
// hero (for example inside a child Suspense boundary).
const HOME_LANGUAGE: SiteLanguage = "en";

export default function Home() {
  const renderedAt = Date.now();
  // Start both reads together; neither blocks the static hero and discovery content.
  const storiesPromise = getLatestStories(3);
  const breakingPromise = getHomeBreakingStories(renderedAt);
  const lang = HOME_LANGUAGE;

  return (
    <div className="public-home">
      <StructuredData data={[websiteSchema(), organizationSchema()]} />
      <section className="home-hero" aria-labelledby="home-title">
        <HeroCarousel>
          <div className="home-hero__content ep-container">
            <p className="home-hero__eyebrow">{t(lang, "home.eyebrow")}</p>
            <h1 id="home-title">{t(lang, "home.title.line1")}<br />{t(lang, "home.title.line2")}</h1>
            <p className="home-hero__lede">{t(lang, "home.lede")}</p>
            <div className="home-hero__actions">
              <Link href="/news" className="btn-primary">{t(lang, "home.cta.news")} <ArrowRightIcon size={17} aria-hidden="true" /></Link>
              <Link href="/itan-ilu-mi" className="home-hero__secondary">{t(lang, "home.cta.history")} <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </HeroCarousel>
      </section>

      <Suspense fallback={null}><HomeBreaking storiesPromise={breakingPromise} renderedAt={renderedAt} /></Suspense>


      <HomeSectionReveal><div className="ep-container home-discovery">
        {/* Shortcuts come first in the DOM as well as visually, so reading and tab order match what is seen. */}
        <nav className="home-shortcuts" aria-label="Explore EPE LAWA">
          {[
            { href: "/itan-ilu-mi", label: t(lang, "home.shortcut.history"), Icon: CompassIcon },
            { href: "/tourism", label: t(lang, "home.shortcut.places"), Icon: MapPinIcon },
            { href: "/map", label: t(lang, "home.shortcut.map"), Icon: RoadIcon },
            { href: "/business-directory", label: t(lang, "home.shortcut.business"), Icon: BuildingIcon },
            { href: "/events", label: t(lang, "home.shortcut.events"), Icon: CalendarShortcutIcon },
            { href: "/forum", label: t(lang, "home.shortcut.forum"), Icon: MessageCircleIcon },
          ].map(({ href, label, Icon }) => <Link href={href} key={href}><span aria-hidden="true"><Icon size={25} /></span><span>{label}</span></Link>)}
        </nav>
        <section className="home-radio" aria-labelledby="home-radio-title">
          <span className="home-radio__icon" aria-hidden="true"><ListenShortcutIcon size={32} /></span>
          <div><p className="home-radio__eyebrow">{t(lang, "home.radio.eyebrow")}</p><h2 id="home-radio-title">Radio Lagos 107.5 FM</h2><p>{t(lang, "home.radio.subtitle")}</p></div>
          <Link href="/radio" className="home-radio__action">{t(lang, "home.radio.cta")} <ArrowRightIcon size={17} aria-hidden="true" /></Link>
        </section>
      </div></HomeSectionReveal>

      <AdvertiseCallout />

      <HomeSectionReveal><Suspense fallback={<HomeNewsSkeleton />}><HomeNews storiesPromise={storiesPromise} renderedAt={renderedAt} lang={lang} /></Suspense>

      <section className="ep-container home-community connection-panel" aria-labelledby="community-title">
        <div>
          <p className="ui-eyebrow">{t(lang, "home.community.eyebrow")}</p>
          <h2 id="community-title">{t(lang, "home.community.title1")} <em>{t(lang, "home.community.emphasis")}</em></h2>
          <p>{t(lang, "home.community.body")}</p>
        </div>
        <div className="home-community__actions">
          <Link className="btn-primary" href="/auth">{t(lang, "home.community.cta")} <ArrowUpRightIcon size={16} aria-hidden="true" /></Link>
          <Link className="ui-text-link" href="/guidelines">{t(lang, "home.community.guidelines")}</Link>
        </div>
        <ul className="home-community__contribute" aria-label={t(lang, "home.community.contributeLabel")}>
          <li><Link href="/itan-ilu-mi#contribute">{t(lang, "home.community.shareHistory")} <ArrowRightIcon size={15} aria-hidden="true" /></Link></li>
          <li><Link href="/business-directory/submit">{t(lang, "home.community.listBusiness")} <ArrowRightIcon size={15} aria-hidden="true" /></Link></li>
        </ul>
        <span className="connection-panel__icon" aria-hidden="true"><UsersIcon size={96} /></span>
      </section></HomeSectionReveal>
      {/* SitePoll renders its own .home-poll wrapper only when an active poll exists, so no empty band is left above the footer. */}
      <Suspense fallback={null}><SitePoll /></Suspense>
      <CookieBanner />
    </div>
  );
}

async function HomeBreaking({ storiesPromise, renderedAt }: { storiesPromise: Promise<PublicListResult<HomeBreakingStory>>; renderedAt: number }) {
  const breaking = await storiesPromise;
  return breaking.state === "ok" ? <HomeBreakingTicker stories={breaking.items} initialTime={renderedAt} /> : null;
}

function HomeNewsSkeleton() {
  return <section className="ep-container home-news" aria-label="Latest news" aria-busy="true" role="status">
    <div className="home-news__heading"><h2>Latest News</h2></div>
    <span className="sr-only">Loading latest news</span>
    <div className="home-news-skeleton" aria-hidden="true">
      {[0, 1, 2].map((item) => <div className="home-news-skeleton__card" key={item}><div className="home-news-skeleton__image" /><div className="home-news-skeleton__copy"><span /><span /><span /></div></div>)}
    </div>
  </section>;
}

async function HomeNews({ storiesPromise, renderedAt, lang }: { storiesPromise: Promise<PublicListResult<LatestStory>>; renderedAt: number; lang: SiteLanguage }) {
  const stories = await storiesPromise;
  const topStories = stories.items.slice(0, 3);
  return (
      <section className="ep-container home-news" aria-labelledby="latest-title">
        <div className="home-news__heading">
          <div><h2 id="latest-title">{t(lang, "home.news.title")}</h2><HomeLivePill since={renderedAt} label="story" /></div>
          <Link className="ui-text-link" href="/news">{t(lang, "home.news.viewAll")} <ArrowRightIcon size={17} aria-hidden="true" /></Link>
        </div>
        {stories.state === "ok" && topStories.length > 0 ? (
          <ul className={`home-story-list home-story-list--${topStories.length}`}>
            {topStories.map((story, index) => {
              const storyHref = `/news/${story.slug}`;
              return (
                <li key={story.slug} className={index === 0 ? "home-story-item home-story-item--lead" : "home-story-item home-story-item--support"}>
                  <article className="home-story-card">
                    <figure className="home-story-cover">
                      <Link className="home-story-cover-link" href={storyHref} aria-label={`Read story: ${story.title}`}>
                        <NewsImage className="home-story-image" src={story.cover?.src} alt={story.cover?.alt ?? "EPE LAWA logo"} loading="lazy" />
                      </Link>
                      {null}
                    </figure>
                    <div className="home-story-copy">
                      <span className="home-story-meta"><span>{story.category ?? "News"}</span>{story.breakingUntil ? <BreakingBadge until={story.breakingUntil} initialTime={renderedAt} /> : null}{story.publishedAt ? <><span aria-hidden="true">·</span><time dateTime={story.publishedAt}>{formatPublishedDate(story.publishedAt)}</time></> : null}</span>
                      <h3><Link href={storyHref}>{story.title}</Link></h3>
                      {story.summary ? <p className="home-story-summary">{story.summary}</p> : null}
                      {story.engagement ? <StoryStats className="home-story-engagement" stats={story.engagement} labels={{ read: t(lang, "home.engagement.read"), views: t(lang, "home.engagement.views"), comments: t(lang, "home.engagement.comments") }} /> : null}
                      <p className="home-story-byline">{story.authorName ? <ArticleByline name={story.authorName} /> : t(lang, "home.byline.unavailable")}</p>
                      <Link className="home-story-read" href={storyHref}>{t(lang, "home.story.read")} <ArrowUpRightIcon size={16} aria-hidden="true" /></Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={`home-story-state${stories.state === "error" ? " home-story-state--error" : ""}`} role={stories.state === "error" ? "status" : undefined}>
            <h3>{stories.state === "ok" ? t(lang, "home.empty.title") : "The newsroom is unavailable right now"}</h3>
            <p>{stories.state === "ok" ? t(lang, "home.empty.body") : "No stories are shown while the published newsroom cannot be reached."}</p>
            <Link href="/news" className="ui-text-link">{t(lang, "home.empty.cta")} <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </div>
        )}
      </section>
  );
}
