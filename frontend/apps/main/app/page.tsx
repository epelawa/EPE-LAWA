import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "../components/icons";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories } from "../lib/home-data";
import "./hero-logo.css";
import CookieBanner from "../components/cookie-banner";
import HeroCarousel from "../components/hero-carousel";

const modules = [
  { name: "News", href: "/news", description: "Local reporting and community information." },
  { name: "Ìtàn Ilú Mi", href: "/itan-ilu-mi", description: "Community history, preserved with care." },
  { name: "Forum", href: "/forum", description: "A place for local conversation." },
  { name: "Map & Navigation", href: "/map", description: "Find published places and directions." },
  { name: "Business Directory", href: "/business-directory", description: "Discover local businesses." },
  { name: "Tourism", href: "/tourism", description: "Explore Epe’s heritage and places." },
  { name: "EPE LAWA Radio", href: "/radio", description: "Radio information and listening." },
  { name: "Who is Who", href: "/who-is-who", description: "Browse approved public profiles." },
];

export default async function Home() {
  const stories = await getLatestStories(3);

  return (
    <div className="public-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__visual">
          <HeroCarousel />
          <div className="home-hero__content ep-container">
            <p className="home-hero__location">Epe · Lagos State, Nigeria</p>
            <h1 id="home-title">Epe.<br /><em>Closer to home.</em></h1>
            <p className="home-hero__lede">A digital home for Epe’s news, heritage, businesses and community voices.</p>
            <div className="home-hero__actions">
              <Link href="/tourism" className="btn-primary">Explore Epe <ArrowRightIcon size={17} aria-hidden="true" /></Link>
              <Link href="/news" className="home-hero__secondary">Read the latest <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ep-container home-news" aria-labelledby="latest-title">
        <div className="home-news__heading">
          <div><p className="ui-eyebrow">Latest stories</p><h2 id="latest-title">News from Epe</h2></div>
          <Link className="ui-text-link" href="/news">View all news <ArrowRightIcon size={17} aria-hidden="true" /></Link>
        </div>
        {stories.state === "ok" && stories.items.length > 0 ? (
          <ul className="home-story-list">
            {stories.items.map((story) => (
              <li key={story.slug}>
                <Link className="home-story-link" href={`/news/${story.slug}`}>
                  <span className="home-story-meta">{story.category ?? "News"}{story.publishedAt ? <> <span aria-hidden="true">·</span> <time dateTime={story.publishedAt}>{formatPublishedDate(story.publishedAt)}</time></> : null}</span>
                  <h3>{story.title}</h3>
                  {story.summary ? <p>{story.summary}</p> : null}
                  <span className="home-story-read">Read story <ArrowUpRightIcon size={16} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={`home-story-state${stories.state === "error" ? " home-story-state--error" : ""}`} role={stories.state === "error" ? "status" : undefined}>
            <h3>{stories.state === "ok" ? "No stories published yet" : "The newsroom is unavailable right now"}</h3>
            <p>{stories.state === "ok" ? "New reporting will appear here when it is published." : "No stories are shown while the published newsroom cannot be reached."}</p>
            <Link href="/news" className="ui-text-link">Visit the newsroom <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </div>
        )}
      </section>

      <section className="home-index" aria-labelledby="explore-title">
        <div className="ep-container home-index__inner">
          <div className="home-index__heading">
            <div><p className="ui-eyebrow">Discover Epe</p><h2 id="explore-title">Explore what matters to you.</h2></div>
            <p>News, community, places and local knowledge—connected in one place.</p>
          </div>
          <nav aria-label="Explore EPE LAWA">
            <ul className="home-discover-grid">
              {modules.map((item, index) => (
                <li key={item.href}>
                  <Link className="home-discover-link" href={item.href}>
                    <span className="home-discover-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="home-discover-copy"><strong>{item.name}</strong><span>{item.description}</span></span>
                    <ArrowUpRightIcon size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section className="ep-container home-community" aria-labelledby="community-title">
        <div>
          <p className="ui-eyebrow">Belong and contribute</p>
          <h2 id="community-title">Local voices shape this place.</h2>
          <p>Join conversations and share community knowledge through the features available on EPE LAWA.</p>
        </div>
        <div className="home-community__actions">
          <Link className="btn-primary" href="/auth">Create an account <ArrowUpRightIcon size={16} aria-hidden="true" /></Link>
          <Link className="ui-text-link" href="/guidelines">Read the community guidelines</Link>
        </div>
      </section>
      <CookieBanner />
    </div>
  );
}
