import Link from "next/link";
import type { ReactNode } from "react";
import DownloadApp from "../components/download-app";
import { newsUrl } from "../lib/site";

const newsroomUrl = newsUrl;

const modules = [
  {
    number: "01",
    title: "The newsroom",
    copy: "Stories from Epe Division, reported with names, dates and context.",
    href: newsroomUrl,
    external: true,
    className: "landing-v4__module--navy",
  },
  {
    number: "02",
    title: "The public record",
    copy: "A growing archive of the people, places and decisions shaping Epe.",
    href: "/guidelines",
    className: "landing-v4__module--gold",
  },
  {
    number: "03",
    title: "The local signal",
    copy: "Radio, photographs and useful ways to stay close to home.",
    href: "/radio",
    className: "landing-v4__module--light",
  },
];

const steps = [
  [
    "01",
    "Find the signal",
    "Start with the story, question or place you want to understand.",
  ],
  [
    "02",
    "Follow the context",
    "Move beyond the headline with reporting, sources and local perspective.",
  ],
  [
    "03",
    "Stay connected",
    "Read the newsroom, listen to the radio and keep Epe close wherever you are.",
  ],
];

const coverage = [
  "Civic life",
  "Culture & heritage",
  "People & places",
  "Business & enterprise",
  "The coast",
  "Lagos State",
];

function Container({ children }: { children: ReactNode }) {
  return <div className="ep-container">{children}</div>;
}

export default function Home() {
  return (
    <div className="landing-v4">
      <section className="landing-v4__hero" aria-labelledby="landing-v4-title">
        <Container>
          <div className="landing-v4__hero-grid">
            <div className="landing-v4__hero-copy">
              <p className="landing-v4__eyebrow">
                The official Epe Lawa website <span>●</span> Epe Division
              </p>
              <h1 id="landing-v4-title">
                Know your
                <br />
                <em>place.</em>
              </h1>
              <p className="landing-v4__lede">
                The independent publication for the people, places and ideas
                shaping Epe.
              </p>
              <div className="landing-v4__hero-actions">
                <a
                  className="landing-v4__button landing-v4__button--gold"
                  href={newsroomUrl}
                >
                  Read the latest news <span aria-hidden="true">↗</span>
                </a>
                <DownloadApp className="landing-v4__download" />
              </div>
              <p className="landing-v4__microcopy">
                No app account required. Read the newsroom on the web today.
              </p>
            </div>
            <NewsroomPreview />
          </div>
          <div className="landing-v4__hero-meta">
            <span>Independent / local / accountable</span>
            <span>
              Scroll to explore <b aria-hidden="true">↓</b>
            </span>
          </div>
        </Container>
      </section>

      <div className="landing-v4__marquee" aria-label="Epe Lawa values">
        <div>
          LOCAL STORIES <i>✳</i> PUBLIC KNOWLEDGE <i>✳</i> EDITORIAL CARE{" "}
          <i>✳</i> EPE DIVISION <i>✳</i> LOCAL STORIES <i>✳</i> PUBLIC
          KNOWLEDGE <i>✳</i> EDITORIAL CARE <i>✳</i> EPE DIVISION <i>✳</i>
        </div>
      </div>

      <section
        className="landing-v4__statement"
        aria-labelledby="statement-title"
      >
        <Container>
          <div className="landing-v4__section-marker">
            <span>/ 01</span>
            <small>About Epe Lawa</small>
          </div>
          <div className="landing-v4__statement-copy">
            <p className="landing-v4__eyebrow">A sharper view of Epe</p>
            <h2 id="statement-title">
              A place is more than what happens in the news.
            </h2>
            <p>
              It is the people who keep it moving, the memories that give it
              meaning and the decisions that shape what comes next.
            </p>
            <p>
              Epe Lawa is building the publication and public record Epe
              deserves.
            </p>
          </div>
        </Container>
      </section>

      <section className="landing-v4__modules" aria-labelledby="modules-title">
        <Container>
          <div className="landing-v4__section-marker landing-v4__section-marker--light">
            <span>/ 02</span>
            <small>One publication, many ways in</small>
          </div>
          <h2 id="modules-title">
            Everything that keeps
            <br />
            <em>Epe connected.</em>
          </h2>
          <div className="landing-v4__module-grid">
            {modules.map((module) => (
              <a
                className={`landing-v4__module ${module.className}`}
                href={module.href}
                key={module.number}
              >
                <span className="landing-v4__module-number">
                  {module.number}
                </span>
                <div className="landing-v4__module-content">
                  <h3>{module.title}</h3>
                  <p>{module.copy}</p>
                </div>
                <span className="landing-v4__module-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="landing-v4__steps" aria-labelledby="steps-title">
        <Container>
          <div className="landing-v4__section-marker">
            <span>/ 03</span>
            <small>How it works</small>
          </div>
          <div className="landing-v4__steps-heading">
            <div>
              <p className="landing-v4__eyebrow">Built for real life</p>
              <h2 id="steps-title">
                Follow the story.
                <br />
                <em>Find your place in it.</em>
              </h2>
            </div>
            <p>
              Whether you are at home, abroad or somewhere in between, Epe Lawa
              gives you a reliable way back to what is happening here.
            </p>
          </div>
          <div className="landing-v4__steps-grid">
            {steps.map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="landing-v4__standards"
        aria-labelledby="standards-title"
      >
        <Container>
          <div className="landing-v4__standards-card">
            <div className="landing-v4__section-marker landing-v4__section-marker--light">
              <span>/ 04</span>
              <small>Our standard</small>
            </div>
            <div>
              <p className="landing-v4__eyebrow">Trust is a practice</p>
              <h2 id="standards-title">
                No invented people.
                <br />
                <em>No silent edits.</em>
              </h2>
              <p>
                We publish with named sources, dates and a clear path for
                corrections. Our guidelines explain the standard we hold the
                newsroom and community to.
              </p>
              <Link
                className="landing-v4__button landing-v4__button--outline"
                href="/guidelines"
              >
                Read our guidelines <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section
        className="landing-v4__coverage"
        aria-labelledby="coverage-title"
      >
        <Container>
          <div className="landing-v4__section-marker">
            <span>/ 05</span>
            <small>Our coverage</small>
          </div>
          <div className="landing-v4__coverage-grid">
            <div>
              <p className="landing-v4__eyebrow">Close to the ground</p>
              <h2 id="coverage-title">
                The details
                <br />
                <em>make the place.</em>
              </h2>
              <p>
                We follow the forces that give Epe its character — from public
                decisions to cultural memory, enterprise and the people doing
                the work.
              </p>
            </div>
            <ul>
              {coverage.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item}
                  <b aria-hidden="true">↗</b>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="landing-v4__final-cta" aria-labelledby="final-title">
        <Container>
          <div className="landing-v4__final-grid">
            <div>
              <p className="landing-v4__eyebrow">
                The newsroom is live elsewhere
              </p>
              <h2 id="final-title">
                Go where
                <br />
                <em>the story is.</em>
              </h2>
            </div>
            <div>
              <p>
                Our corporate home explains who we are. The latest reporting
                lives at news.epelawa.ng.
              </p>
              <a
                className="landing-v4__button landing-v4__button--dark"
                href={newsroomUrl}
              >
                Visit the newsroom <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="landing-v4__contact" aria-labelledby="contact-title">
        <Container>
          <div className="landing-v4__section-marker landing-v4__section-marker--light">
            <span>/ 06</span>
            <small>Work with us</small>
          </div>
          <div className="landing-v4__contact-grid">
            <div>
              <h2 id="contact-title">
                Bring us
                <br />
                <em>something real.</em>
              </h2>
            </div>
            <div className="landing-v4__contact-links">
              <Link href="/contact">
                Contact & partnerships <span>↗</span>
              </Link>
              <Link href="/contact">
                Advertise with us <span>↗</span>
              </Link>
              <Link href="/contact">
                Submit a story <span>↗</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

function NewsroomPreview() {
  return (
    <div
      className="landing-v4__preview"
      aria-label="Preview of the Epe Lawa newsroom"
    >
      <div className="landing-v4__preview-window">
        <div className="landing-v4__preview-top">
          <span>EPE LAWA</span>
          <span>
            NEWSROOM <i>●</i>
          </span>
        </div>
        <div className="landing-v4__preview-lead">
          <span>FROM THE GROUND</span>
          <strong>
            Stories that make
            <br />a place legible.
          </strong>
          <small>Read the latest reporting ↗</small>
        </div>
        <div className="landing-v4__preview-row">
          <span>01</span>
          <div>
            <b>Civic life</b>
            <small>Reporting from Epe Division</small>
          </div>
          <span>↗</span>
        </div>
        <div className="landing-v4__preview-row">
          <span>02</span>
          <div>
            <b>People & places</b>
            <small>The voices shaping the town</small>
          </div>
          <span>↗</span>
        </div>
      </div>
      <span className="landing-v4__preview-caption">
        A newsroom for Epe / built for context
      </span>
    </div>
  );
}
