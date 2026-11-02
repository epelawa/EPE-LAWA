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
import { newsUrl } from "../lib/site";

/**
 * Landing page. Every block below is either a real destination or an honest empty state.
 *
 * There is no database yet, so the news, directory, forum and profile blocks render the
 * empty state their real implementation will also use. Nothing here is a placeholder
 * headline, a sample business, a count or a "coming soon" card.
 */
export default function Home() {
  return (
    <Container>
      <section className="hero" aria-labelledby="hero-title">
        <span className="hero__rule" aria-hidden="true" />
        <p className="hero__eyebrow">EPE LAWA · Epe Division</p>
        <h1 id="hero-title" className="hero__title">
          The Voice of Epe Division
        </h1>
        <p className="hero__lede">
          News, conversation, radio and local businesses for Epe Division, Lagos State, at home
          and abroad.
        </p>
        <div className="hero__actions">
          {newsUrl ? (
            <a className={buttonClassName("primary")} href={newsUrl}>
              Read the news
            </a>
          ) : null}
          <Link className={buttonClassName(newsUrl ? "secondary" : "primary")} href="/about">
            About EPE LAWA
          </Link>
          <Link className={buttonClassName("ghost")} href="/contact">
            Contact us
          </Link>
        </div>
        <p className="hero__note">
          The news publication and the radio stream are not connected yet, so there is no
          published story or live stream to open today.
        </p>
      </section>

      <section className="home-block" aria-labelledby="news-heading">
        <div className="home-block__head">
          <h2 id="news-heading">News</h2>
          <p className="home-block__note">Reporting from Epe Division.</p>
        </div>
        <div className="home-block__body">
          <EmptyState
            icon={<NewsIcon size={20} />}
            action={
              newsUrl ? (
                <a href={newsUrl}>
                  Go to EPE LAWA News
                </a>
              ) : null
            }
          >
            No stories have been published yet.
          </EmptyState>
        </div>
      </section>

      <section className="home-block" aria-labelledby="who-heading">
        <div className="home-block__head">
          <h2 id="who-heading">Who is Who</h2>
          <p className="home-block__note">People and public office holders in Epe Division.</p>
        </div>
        <div className="home-block__body">
          <EmptyState
            icon={<PeopleIcon size={20} />}
            action={<Link href="/guidelines#verification">What verification means here</Link>}
          >
            No profiles have been published yet.
          </EmptyState>
        </div>
      </section>

      <section className="home-block" aria-labelledby="radio-heading">
        <div className="home-block__head">
          <h2 id="radio-heading">Radio</h2>
          <p className="home-block__note">The EPE LAWA programme, and its schedule.</p>
        </div>
        <div className="home-block__body ep-on-dark">
          <div className="radio-panel">
            <p className="radio-panel__station">EPE LAWA on Radio Lagos 107.5 FM Àmitítí</p>
            <p className="radio-panel__status">
              <RadioIcon size={16} />
              Not live right now
            </p>
            <p className="radio-panel__detail">
              The online stream is not connected yet, so there is nothing to play here. When it
              is connected, the player will not start on its own.
            </p>
            <p className="radio-panel__detail">No programme schedule has been published yet.</p>
          </div>
        </div>
      </section>

      <section className="home-block" aria-labelledby="forum-heading">
        <div className="home-block__head">
          <h2 id="forum-heading">Forum</h2>
          <p className="home-block__note">Conversations between people of Epe Division.</p>
        </div>
        <div className="home-block__body">
          <EmptyState
            icon={<ForumIcon size={20} />}
            action={<Link href="/guidelines">Read the community guidelines</Link>}
          >
            No conversations have been started yet.
          </EmptyState>
        </div>
      </section>

      <section className="home-block" aria-labelledby="business-heading">
        <div className="home-block__head">
          <h2 id="business-heading">Businesses</h2>
          <p className="home-block__note">Businesses serving Epe Division.</p>
        </div>
        <div className="home-block__body">
          <EmptyState icon={<BusinessIcon size={20} />}>
            No businesses have been listed yet.
          </EmptyState>
        </div>
      </section>

      <section className="trust" aria-labelledby="trust-heading">
        <h2 id="trust-heading">How we work</h2>
        <p className="trust__text">
          EPE LAWA publishes with named sources, dates its corrections and moderates against
          published rules. The <Link href="/guidelines">community and editorial guidelines</Link>{" "}
          explain what that means in practice, including what a verified badge does and does not
          claim.
        </p>
      </section>
    </Container>
  );
}
