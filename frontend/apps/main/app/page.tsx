"use client";

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
import { newsUrl } from "../lib/site";

/**
 * Landing page.
 *
 * Every section is either a real destination or an honest empty state. Nothing here is a
 * fabricated statistic, a sample business, a count, or a "coming soon" card. The app-download
 * button opens a truthful dialog — there is no published Android build yet — instead of a
 * dead link.
 */
export default function Home() {
  return (
    <Container>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__stack">
          <Reveal className="hero__text">
            <span className="hero__rule" aria-hidden="true" />
            <p className="hero__eyebrow">EPE LAWA · Epe Division</p>
            <h1 id="hero-title" className="hero__title">
              The Voice of Epe Division
            </h1>
            <p className="hero__lede">
              News, conversation, radio and local businesses for Epe Division, Lagos State, at
              home and abroad.
            </p>
            <div className="hero__actions">
              {newsUrl ? (
                <a className={buttonClassName("primary")} href={newsUrl}>
                  Read the news
                </a>
              ) : null}
              <DownloadApp className="hero__app" />
              <Link className={buttonClassName(newsUrl ? "secondary" : "primary")} href="/about">
                About EPE LAWA
              </Link>
            </div>
            <p className="hero__note">
              The news publication and the online stream are not connected yet, so there is no
              published story or live stream to open today.
            </p>
          </Reveal>

          <Reveal className="hero__media" delay={120}>
            <HeroArt />
          </Reveal>
        </div>
      </section>

      <section className="home-block" aria-labelledby="news-heading">
        <div className="home-block__head">
          <h2 id="news-heading">News</h2>
          <p className="home-block__note">Reporting from Epe Division.</p>
        </div>
        <div className="home-block__body">
          <Reveal className="home-block__card" delay={240}>
            <EmptyState icon={<NewsIcon size={20} />}>
              No stories have been published yet.
            </EmptyState>
          </Reveal>
        </div>
      </section>

      <section className="home-block" aria-labelledby="who-heading">
        <div className="home-block__head">
          <h2 id="who-heading">Who is Who</h2>
          <p className="home-block__note">People and public office holders in Epe Division.</p>
        </div>
        <div className="home-block__body">
          <Reveal className="home-block__card" delay={240}>
            <EmptyState
              icon={<PeopleIcon size={20} />}
              action={<Link href="/guidelines#verification">What verification means here</Link>}
            >
              No profiles have been published yet.
            </EmptyState>
          </Reveal>
        </div>
      </section>

      <section className="home-block" aria-labelledby="radio-heading">
        <div className="home-block__head">
          <h2 id="radio-heading">Radio</h2>
          <p className="home-block__note">The EPE LAWA programme, Radio Lagos 107.5 FM.</p>
        </div>
        <div className="home-block__body ep-on-dark">
          <div className="radio-panel">
            <p className="radio-panel__station">Radio Lagos 107.5 FM</p>
            <p className="radio-panel__status">
              <RadioIcon size={16} />
              Not live right now
            </p>
            <p className="radio-panel__detail">
              The online stream is not connected yet, so there is nothing to play here. When it is
              connected, the player will not start on its own.
            </p>
            <p className="radio-panel__detail">No programme schedule has been published yet.</p>
            <Link className={buttonClassName("ghost")} href="/radio">
              Open the radio page
            </Link>
          </div>
        </div>
      </section>

      <section className="home-block" aria-labelledby="forum-heading">
        <div className="home-block__head">
          <h2 id="forum-heading">Forum</h2>
          <p className="home-block__note">Conversations between people of Epe Division.</p>
        </div>
        <div className="home-block__body">
          <Reveal className="home-block__card" delay={240}>
            <EmptyState
              icon={<ForumIcon size={20} />}
              action={<Link href="/guidelines">Read the community guidelines</Link>}
            >
              No conversations have been started yet.
            </EmptyState>
          </Reveal>
        </div>
      </section>

      <section className="home-block" aria-labelledby="business-heading">
        <div className="home-block__head">
          <h2 id="business-heading">Businesses</h2>
          <p className="home-block__note">Businesses serving Epe Division.</p>
        </div>
        <div className="home-block__body">
          <Reveal className="home-block__card" delay={240}>
            <EmptyState icon={<BusinessIcon size={20} />}>
              No businesses have been listed yet.
            </EmptyState>
          </Reveal>
        </div>
      </section>

      <section className="home-block" aria-labelledby="gallery-heading">
        <div className="home-block__head">
          <h2 id="gallery-heading">Gallery</h2>
          <p className="home-block__note">Photographs from across Epe Division.</p>
        </div>
        <div className="home-block__body">
          <Reveal className="home-block__card" delay={240}>
            <EmptyState icon={<RadioIcon size={20} />}>
              No photographs have been published yet.
            </EmptyState>
          </Reveal>
        </div>
      </section>

      <section className="trust" aria-labelledby="trust-heading">
        <Reveal className="trust__text" delay={320}>
          <h2 id="trust-heading">How we work</h2>
          <p>
            EPE LAWA publishes with named sources, dates its corrections and moderates against
            published rules. The{" "}
            <Link href="/guidelines">community and editorial guidelines</Link>{" "}
            explain what that means in practice, including what a verified badge does and does not
            claim.
          </p>
        </Reveal>
      </section>
    </Container>
  );
}
