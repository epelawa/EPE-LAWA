import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "../components/icons";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories } from "../lib/home-data";

const modules = [
  {
    number: "01",
    name: "Trending News",
    href: "/news",
    description: "Read current reporting and updates from across Epe Division.",
    tone: "red",
  },
  {
    number: "02",
    name: "Ìtàn Ilú Mi",
    href: "/itan-ilu-mi",
    description: "Explore community history, culture and local knowledge.",
    tone: "coral",
  },
  {
    number: "03",
    name: "Chat Forum",
    href: "/forum",
    description: "Join conversation with people across the Epe community.",
    tone: "blue",
  },
  {
    number: "04",
    name: "Map & Navigation",
    href: "/map",
    description: "Search for useful places and find directions around the division.",
    tone: "red",
  },
  {
    number: "05",
    name: "Epe Business Directory & Marketplace",
    href: "/business-directory",
    description: "Find local businesses and browse available products in one place.",
    tone: "coral",
  },
  {
    number: "06",
    name: "Historical Sites & Tourism",
    href: "/tourism",
    description: "Explore published heritage places, visiting information and directions.",
    tone: "blue",
  },
  {
    number: "07",
    name: "EPE LAWA Radio",
    href: "/radio",
    description: "Listen to the programme and check published schedules and episodes.",
    tone: "red",
  },
  {
    number: "08",
    name: "Who is Who in Epe",
    href: "/who-is-who",
    description: "Find published profiles, biographies and public-office records.",
    tone: "coral",
  },
] as const;

export default async function Home() {
  const stories = await getLatestStories(3);

  return (
    <div className="public-home">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="ep-container landing-hero__inner">
          <div className="landing-hero__copy">
            <p className="eyebrow"><span aria-hidden="true" /> Epe Division · Lagos State</p>
            <h1 id="landing-title">A closer view of <span>Epe.</span></h1>
            <p className="landing-hero__lede">Stories, voices and useful connections from the place we call home.</p>
            <p className="landing-hero__body">
              EPE LAWA brings community information together in one place, with room for local
              reporting, culture, conversation and discovery.
            </p>
            <div className="landing-actions">
              <Link className="btn-primary" href="/news">
                Explore EPE LAWA <span aria-hidden="true"><ArrowRightIcon size={18} /></span>
              </Link>
              <Link className="landing-link" href="/itan-ilu-mi">
                Explore community history <span aria-hidden="true"><ArrowUpRightIcon size={18} /></span>
              </Link>
            </div>
          </div>
          <div className="hero-note" aria-label="A home for the many ways Epe connects">
            <span className="hero-note__overline">Rooted here</span>
            <p>Local stories.<br />Shared knowledge.<br /><strong>One community.</strong></p>
            <span className="hero-note__rule" aria-hidden="true" />
            <span className="hero-note__caption">A community platform for Epe Division</span>
          </div>
        </div>
      </section>

      <section className="welcome-band" aria-labelledby="welcome-title">
        <div className="ep-container welcome-band__inner">
          <p className="eyebrow">Made for Epe</p>
          <h2 id="welcome-title">Many ways to stay connected.</h2>
          <p>Keep up with what matters, find useful local information, and take part in the conversations that shape everyday community life.</p>
        </div>
      </section>

      <section className="module-section" aria-labelledby="modules-title">
        <div className="ep-container">
          <div className="section-heading">
            <div><p className="eyebrow">Explore EPE LAWA</p><h2 id="modules-title">One community, many stories.</h2></div>
            <p>Read, remember, connect, find your way and support local businesses.</p>
          </div>
          <ol className="module-grid">
            {modules.map((module) => (
              <li key={module.href}>
                <Link className={`module-card module-card--${module.tone}`} href={module.href}>
                  <span className="module-card__number">{module.number}</span>
                  <span className="module-card__title">{module.name}</span>
                  <span className="module-card__description">{module.description}</span>
                  <span className="module-card__arrow" aria-hidden="true"><ArrowUpRightIcon size={18} /></span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="record-section" aria-labelledby="stories-title">
        <div className="ep-container record-layout">
          <div className="record-intro">
            <p className="eyebrow">From the newsroom</p><h2 id="stories-title">The latest stories.</h2>
            <p>Read reporting published by EPE LAWA.</p>
            <Link className="text-cta" href="/news">Go to news <ArrowRightIcon size={18} aria-hidden="true" /></Link>
          </div>
          <div className="record-content">
            {stories.state === "ok" && stories.items.length > 0 ? (
              <ul className="story-list">
                {stories.items.map((story) => {
                  const published = formatPublishedDate(story.publishedAt);
                  return (
                    <li key={story.slug}>
                      <Link href={`/news/${story.slug}`} className="story-row">
                        <span className="story-row__meta">{story.category}{story.category && published ? " · " : ""}{published}</span>
                        <span className="story-row__title">{story.title}</span>
                        {story.summary ? <span className="story-row__summary">{story.summary}</span> : null}
                        <span className="story-row__arrow" aria-hidden="true"><ArrowUpRightIcon size={18} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : stories.state === "ok" ? (
              <div className="empty-message"><h3>No stories have been published yet.</h3><p>New reporting will appear here when it is published.</p></div>
            ) : (
              <div className="empty-message empty-message--error"><h3>Stories could not be loaded.</h3><p>Please try again later. The newsroom remains available.</p><Link href="/news">Visit the news page</Link></div>
            )}
          </div>
        </div>
      </section>

      <section className="community-section" aria-labelledby="community-title">
        <div className="ep-container community-layout">
          <div><p className="eyebrow">A place to take part</p><h2 id="community-title">Built around people and place.</h2></div>
          <div className="community-copy">
            <p>From local reporting to history, conversation and discovery, EPE LAWA is a growing home for the ways people connect with Epe.</p>
            <p>Stories and local information appear when they are verified and approved, not filled in with guesses.</p>
            <Link className="text-cta" href="/forum">Join the conversation <ArrowRightIcon size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="closing-cta" aria-labelledby="closing-title">
        <div className="ep-container closing-cta__inner">
          <p className="eyebrow">EPE LAWA · Epe Division</p><h2 id="closing-title">Stay close to what’s happening here.</h2>
          <p>Start with the latest reporting and explore the community platform.</p>
          <Link className="btn-primary btn-primary--light" href="/news">Read the latest <ArrowRightIcon size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
