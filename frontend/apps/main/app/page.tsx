import Link from "next/link";
import { CONTACT_EMAIL } from "../lib/contact";
import { getLatestStories, getPublishedPeople } from "../lib/home-data";

/**
 * EPE LAWA — front page.
 *
 * Editorial order: Lead, Latest, Who is Who, Radio, What we cover, How we work,
 * Contact, Footer.
 *
 * Rules this page holds itself to:
 * - Nothing sends a visitor off-site. The newsroom is `/news` on this host.
 * - Every list has three real states. Empty says nothing has been published;
 *   unavailable says we could not read the data. They never share copy.
 * - No invented people, numbers, schedules, stream URLs or "coming soon".
 * - The radio section never claims a live broadcast, because this page does not
 *   check one.
 */

const COVERAGE: ReadonlyArray<{ term: string; detail: string }> = [
  {
    term: "Politics",
    detail: "Council decisions, public money, and who answers for them.",
  },
  {
    term: "Community",
    detail: "The people, associations and everyday life of the division.",
  },
  {
    term: "Culture",
    detail: "Language, festivals, craft and the memory a place keeps.",
  },
  {
    term: "Education",
    detail: "Schools, teachers and what students in Epe can reach.",
  },
  {
    term: "Business",
    detail: "Enterprise, markets and the work people do to stay here.",
  },
  {
    term: "Sports",
    detail: "Local clubs, competitions and the people who carry them.",
  },
  {
    term: "Events",
    detail: "What is happening, with a date and a place attached.",
  },
];

const COMMITMENTS = ["Named sources", "Dates on every claim", "A public corrections path"];

const COMMUNITY_LABELS: Record<string, string> = {
  eko_epe: "Eko Epe",
  ijebu_epe: "Ijebu Epe",
  other: "Other community",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateFormat.format(parsed);
}

export default async function Home() {
  const [stories, people] = await Promise.all([
    getLatestStories(3),
    getPublishedPeople(3),
  ]);

  return (
    <div className="home">
      {/* ── Lead ─────────────────────────────────────────────────────────── */}
      <section className="home-lead" aria-labelledby="lead-title">
        <div className="ep-container">
          <div className="home-lead__inner">
            <p className="home-label home-lead__label">
              <span className="home-lead__rule" aria-hidden="true" />
              Epe Division, Lagos State
            </p>

            <h1 className="home-lead__title" id="lead-title">
              Epe, in full.
            </h1>

            <div className="home-lead__aside">
              <p className="home-lead__lede">
                EPE LAWA reports on Epe Division: its people, its public
                decisions and its culture. Named sources, dates on every claim,
                and a public way to ask for a correction.
              </p>
              <div className="home-actions">
                <Link className="btn-primary" href="/news">
                  Read the news
                </Link>
                <Link className="home-textlink" href="/radio">
                  Listen to the radio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Latest ───────────────────────────────────────────────────────── */}
      <section
        className="home-section"
        aria-labelledby="latest-title"
      >
        <div className="ep-container">
          <div className="home-section__head">
            <h2 className="home-section__title" id="latest-title">
              Latest stories
            </h2>
            <Link className="home-textlink" href="/news">
              All stories
            </Link>
          </div>

          {stories.state === "ok" && stories.items.length > 0 ? (
            <ul className="home-list">
              {stories.items.map((story) => {
                const published = formatDate(story.publishedAt);
                return (
                  <li className="home-list__item" key={story.slug}>
                    <Link className="home-row" href={`/news/${story.slug}`}>
                      <span className="home-row__meta">
                        {story.category ? <span>{story.category}</span> : null}
                        {story.category && published ? (
                          <span className="home-row__sep" aria-hidden="true">
                            ·
                          </span>
                        ) : null}
                        {published ? <span>{published}</span> : null}
                      </span>
                      <div className="home-row__body">
                        <h3 className="home-row__title">{story.title}</h3>
                        {story.summary ? (
                          <p className="home-row__summary">{story.summary}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : stories.state === "ok" ? (
            <div className="home-empty">
              <p className="home-empty__title">No stories have been published yet.</p>
              <p className="home-empty__body">
                When the first stories are published they will appear here, each
                with a byline, a date and a way to request a correction.
              </p>
            </div>
          ) : (
            <div className="home-empty home-empty--error">
              <p className="home-empty__title">
                The latest stories could not be loaded.
              </p>
              <p className="home-empty__body">
                This is a problem on our side, not something you did. The
                newsroom index is still open.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Who is Who ───────────────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="people-title">
        <div className="ep-container">
          <div className="home-section__head">
            <h2 className="home-section__title" id="people-title">
              Who is Who
            </h2>
            <Link className="home-textlink" href="/who-is-who">
              Open the directory
            </Link>
          </div>

          {people.state === "ok" && people.items.length > 0 ? (
            <ul className="home-people">
              {people.items.map((person) => {
                const community = person.community
                  ? COMMUNITY_LABELS[person.community] ?? null
                  : null;
                return (
                  <li key={person.slug}>
                    <Link className="home-person" href={`/who-is-who/${person.slug}`}>
                      <span className="home-person__name">{person.name}</span>
                      {community ? (
                        <span className="home-person__meta">{community}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : people.state === "ok" ? (
            <div className="home-empty">
              <p className="home-empty__title">No profiles have been published yet.</p>
              <p className="home-empty__body">
                A profile appears only after at least one recorded source has
                been checked, so the directory starts empty.
              </p>
            </div>
          ) : (
            <div className="home-empty home-empty--error">
              <p className="home-empty__title">The directory could not be loaded.</p>
              <p className="home-empty__body">
                This is a problem on our side. No profile has been changed or
                removed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Radio ────────────────────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="radio-title">
        <div className="ep-container">
          <div className="home-split">
            <div>
              <p className="home-label">Radio</p>
              <h2 className="home-section__title" id="radio-title">
                Carried on Radio Lagos 107.5 FM.
              </h2>
            </div>
            <div className="home-split__body">
              <p>
                The EPE LAWA programme is carried on Radio Lagos 107.5 FM. The
                web player does not check whether the station is on air, so
                nothing here is ever labelled as live.
              </p>
              <p>
                Press play on the player page when you are ready. Nothing starts
                on its own, and no schedule is published until one is confirmed.
              </p>
              <div className="home-actions">
                <Link className="home-textlink" href="/radio">
                  Open the player
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What we cover ────────────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="coverage-title">
        <div className="ep-container">
          <div className="home-section__head">
            <h2 className="home-section__title" id="coverage-title">
              What we cover
            </h2>
            <p className="home-section__note">
              Seven areas, reported the same way. Category filtering is not
              built yet, so these are listed as text rather than links.
            </p>
          </div>

          <dl className="home-cover">
            {COVERAGE.map((item) => (
              <div className="home-cover__row" key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── How we work ──────────────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="standards-title">
        <div className="ep-container">
          <div className="home-split">
            <div>
              <p className="home-label">Standards</p>
              <h2 className="home-section__title" id="standards-title">
                How we work
              </h2>
            </div>
            <div className="home-split__body">
              <p>
                Every story carries a source and a date. When we get something
                wrong we correct it in place and say what changed, rather than
                editing quietly. The guidelines are public and they bind the
                newsroom as much as they bind the comments.
              </p>
              <ul className="home-commitments">
                {COMMITMENTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="home-actions">
                <Link className="home-textlink" href="/guidelines">
                  Read the guidelines
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section className="home-contact" aria-labelledby="contact-title">
        <div className="ep-container">
          <div className="home-split">
            <div>
              <p className="home-label">Contact</p>
              <h2 className="home-section__title" id="contact-title">
                Talk to the newsroom.
              </h2>
            </div>
            <div className="home-split__body">
              <p>
                Story tips, corrections, partnership requests and complaints all
                reach the same desk. If something here is wrong, tell us and we
                will look at it.
              </p>
              <div className="home-contact__links">
                <Link className="home-contact__link" href="/contact">
                  Contact the newsroom
                </Link>
                <a className="home-contact__email" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
