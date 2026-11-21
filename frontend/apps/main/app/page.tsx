import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, UsersIcon, ListenShortcutIcon, NewsShortcutIcon, CompassIcon, BuildingIcon, MessageCircleIcon, CalendarShortcutIcon, ClockIcon, EyeIcon } from "../components/icons";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories, getHomeBreakingStories } from "../lib/home-data";
import "./hero-logo.css";
import "./connection-panel.css";
import "./home-client-refresh.css";
import CookieBanner from "../components/cookie-banner";
import HeroCarousel from "../components/hero-carousel";
import NewsImage from "../components/news-image";
import ArticleByline from "../components/article-byline";
import { HomeBreakingTicker } from "../components/home-breaking-ticker";
import { BreakingBadge } from "../components/breaking-news";
import SponsorSlot from "../components/sponsor-slot";
import { HomeSectionReveal } from "../components/home-sections";
import SitePoll from "../components/site-poll";
import HomeLivePill from "../components/home-live-pill";
import AdsSection from "../components/ads-section";

export default async function Home() {
  const renderedAt = Date.now();
  const [stories, breaking] = await Promise.all([getLatestStories(3), getHomeBreakingStories(renderedAt)]);
  const topStories = stories.items.slice(0, 3);

  return (
    <div className="public-home">
      <section className="home-hero" aria-labelledby="home-title">
        <HeroCarousel>
          <div className="home-hero__content ep-container">
            <p className="home-hero__eyebrow">EPE DIVISION</p>
            <h1 id="home-title">Stay Connected,<br />Stay Informed</h1>
            <p className="home-hero__lede">Your community, your stories, your Epe.</p>
            <div className="home-hero__actions">
              <Link href="/news" className="btn-primary">Read latest news <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </HeroCarousel>
      </section>

      {breaking.state === "ok" ? <HomeBreakingTicker stories={breaking.items} initialTime={renderedAt} /> : null}

      <SponsorSlot />

      <HomeSectionReveal><div className="ep-container home-discovery">
        <section className="home-radio" aria-labelledby="home-radio-title">
          <span className="home-radio__icon" aria-hidden="true"><ListenShortcutIcon size={32} /></span>
          <div><p className="home-radio__eyebrow">EPE LAWA RADIO</p><h2 id="home-radio-title">Radio Lagos 107.5 FM</h2><p>Listen to the station and explore our programmes.</p></div>
          <Link href="/radio" className="home-radio__action">Listen to radio <ArrowRightIcon size={17} aria-hidden="true" /></Link>
        </section>
        <nav className="home-shortcuts" aria-label="Explore EPE LAWA">
          {[
            { href: "/news", label: "Latest news", Icon: NewsShortcutIcon },
            { href: "/radio", label: "Listen to radio", Icon: ListenShortcutIcon },
            { href: "/itan-ilu-mi", label: "Community history", Icon: CompassIcon },
            { href: "/forum", label: "Join the conversation", Icon: MessageCircleIcon },
            { href: "/business-directory", label: "Local businesses", Icon: BuildingIcon },
            { href: "/events", label: "Community events", Icon: CalendarShortcutIcon },
            { href: "/advertise", label: "Advertise with us", Icon: UsersIcon },
          ].map(({ href, label, Icon }) => <Link href={href} key={href}><span aria-hidden="true"><Icon size={25} /></span><span>{label}</span></Link>)}
        </nav>
      </div></HomeSectionReveal>

      <HomeSectionReveal><AdsSection heading="Businesses in our community" /></HomeSectionReveal>

      <HomeSectionReveal><section className="ep-container home-news" aria-labelledby="latest-title">
        <div className="home-news__heading">
          <div><h2 id="latest-title">Latest News</h2><HomeLivePill since={renderedAt} label="story" /></div>
          <Link className="ui-text-link" href="/news">View all news <ArrowRightIcon size={17} aria-hidden="true" /></Link>
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
                      <span className="home-story-meta">{story.category ?? "News"} {story.breakingUntil ? <BreakingBadge until={story.breakingUntil} initialTime={renderedAt} /> : null}{story.publishedAt ? <> <span aria-hidden="true">·</span> <time dateTime={story.publishedAt}>{formatPublishedDate(story.publishedAt)}</time></> : null}</span>
                      <h3><Link href={storyHref}>{story.title}</Link></h3>
                      {story.summary ? <p className="home-story-summary">{story.summary}</p> : null}
                      {story.engagement ? <div className="home-story-engagement" aria-label="Story engagement"><span><ClockIcon size={14} /> {story.engagement.readMinutes} min read</span><span><EyeIcon size={14} /> {story.engagement.views.toLocaleString("en-NG")} views</span><span><MessageCircleIcon size={14} /> {story.engagement.comments.toLocaleString("en-NG")} comments</span></div> : null}
                      <p className="home-story-byline">{story.authorName ? <ArticleByline name={story.authorName} /> : "Byline unavailable"}</p>
                      <Link className="home-story-read" href={storyHref}>Read story <ArrowUpRightIcon size={16} aria-hidden="true" /></Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={`home-story-state${stories.state === "error" ? " home-story-state--error" : ""}`} role={stories.state === "error" ? "status" : undefined}>
            <h3>{stories.state === "ok" ? "No stories published yet" : "The newsroom is unavailable right now"}</h3>
            <p>{stories.state === "ok" ? "New reporting will appear here when it is published." : "No stories are shown while the published newsroom cannot be reached."}</p>
            <Link href="/news" className="ui-text-link">Visit the newsroom <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </div>
        )}
      </section>

      <section className="ep-container home-community connection-panel" aria-labelledby="community-title">
        <div>
          <p className="ui-eyebrow">OUR PLACE. OUR VOICES.</p>
          <h2 id="community-title">Good things begin with <em>connection.</em></h2>
          <p>Join conversations and share community knowledge through the features available on EPE LAWA.</p>
        </div>
        <div className="home-community__actions">
          <Link className="btn-primary" href="/auth">Create an account <ArrowUpRightIcon size={16} aria-hidden="true" /></Link>
          <Link className="ui-text-link" href="/guidelines">Read the community guidelines</Link>
        </div>
        <span className="connection-panel__icon" aria-hidden="true"><UsersIcon size={96} /></span>
      </section></HomeSectionReveal>
      <HomeSectionReveal><div className="ep-container home-poll"><SitePoll /></div></HomeSectionReveal>
      <SponsorSlot footer />
      <CookieBanner />
    </div>
  );
}
