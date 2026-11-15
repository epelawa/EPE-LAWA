import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, UsersIcon } from "../components/icons";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories } from "../lib/home-data";
import "./hero-logo.css";
import "./connection-panel.css";
import CookieBanner from "../components/cookie-banner";
import HeroCarousel from "../components/hero-carousel";

export default async function Home() {
  const stories = await getLatestStories(3);

  return (
    <div className="public-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__visual">
          <HeroCarousel />
          <div className="home-hero__content ep-container">
            <h1 id="home-title">
              <span className="home-hero__title-line">Epe</span>
              <span className="home-hero__title-line home-hero__title-line--accent">Closer</span>
              <span className="home-hero__title-line home-hero__title-line--preposition">To</span>
              <span className="home-hero__title-line">Home</span>
            </h1>
            <p className="home-hero__lede">From local headlines to the people, places and ideas shaping everyday life in Epe, this is a place to stay informed and feel connected.</p>
            <div className="home-hero__actions">
              <Link href="/news" className="btn-primary">Read the latest stories <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
            <nav className="home-hero__quicknav" aria-label="Quick access to EPE LAWA features">
              <span className="home-hero__quicknav-title">Explore sections</span>
              <ul>
                {modules.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.name}<ArrowUpRightIcon size={14} aria-hidden="true" /></Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      <section className="ep-container home-news" aria-labelledby="latest-title">
        <div className="home-news__heading">
          <div><p className="ui-eyebrow">The latest</p><h2 id="latest-title">Stories from Epe</h2></div>
          <Link className="ui-text-link" href="/news">All stories <ArrowRightIcon size={17} aria-hidden="true" /></Link>
        </div>
        {stories.state === "ok" && stories.items.length > 0 ? (
          <ul className={`home-story-list home-story-list--${stories.items.length}`}>
            {stories.items.map((story, index) => {
              const storyHref = `/news/${story.slug}`;
              return (
                <li key={story.slug} className={index === 0 ? "home-story-item home-story-item--lead" : "home-story-item home-story-item--support"}>
                  <article className="home-story-card">
                    {story.cover ? (
                      <figure className="home-story-cover">
                        <Link className="home-story-cover-link" href={storyHref} aria-label={`Read story: ${story.title}`}>
                          <img className="home-story-image" src={story.cover.src} alt={story.cover.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                        </Link>
                        <figcaption>
                          {story.cover.caption ? <span className="home-story-cover-caption">{story.cover.caption}</span> : null}
                          <span className="home-story-cover-attribution">Photo: <a href={story.cover.source} target="_blank" rel="noopener noreferrer">{story.cover.credit}</a> · <a href={story.cover.license} target="_blank" rel="noopener noreferrer">License</a></span>
                        </figcaption>
                      </figure>
                    ) : (
                      <div className="home-story-cover home-story-cover--unavailable">
                        <span>No credited cover image available.</span>
                      </div>
                    )}
                    <div className="home-story-copy">
                      <span className="home-story-meta">{story.category ?? "News"}{story.publishedAt ? <> <span aria-hidden="true">·</span> <time dateTime={story.publishedAt}>{formatPublishedDate(story.publishedAt)}</time></> : null}</span>
                      <h3><Link href={storyHref}>{story.title}</Link></h3>
                      {story.summary ? <p className="home-story-summary">{story.summary}</p> : null}
                      <p className="home-story-byline">{story.authorName ? `By ${story.authorName}` : "Byline unavailable"}</p>
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
      </section>
      <CookieBanner />
    </div>
  );
}
