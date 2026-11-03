import Link from "next/link";
import { Container } from "@epelawa/ui";
import DownloadApp from "../components/download-app";
import { newsUrl } from "../lib/site";

const palette = {
  newsroom: newsUrl ?? "https://news.epelawa.ng",
};

const work = [
  [
    "01",
    "Newsroom",
    "Verified, dated reporting from Epe Division.",
    palette.newsroom,
  ],
  ["02", "Radio", "A local voice on Radio Lagos 107.5 FM.", "/radio"],
  [
    "03",
    "Gallery",
    "A visual record of the people and places we share.",
    "/gallery",
  ],
  [
    "04",
    "Public standards",
    "Our sourcing, corrections and community rules in the open.",
    "/guidelines",
  ],
];

const coverage = [
  "Epe Division",
  "Lagos State",
  "Civic life",
  "Culture & heritage",
  "People & places",
  "Business & enterprise",
];

export default function Home() {
  return (
    <div className="landing-v3">
      <section className="landing-v3__hero" aria-labelledby="landing-title">
        <Container>
          <div className="landing-v3__masthead">
            <span>EPE LAWA / PUBLICATION</span>
            <span>06°35′N 003°59′E</span>
          </div>
          <div className="landing-v3__hero-grid">
            <div className="landing-v3__hero-copy">
              <p className="landing-v3__eyebrow">
                The official Epe Lawa website
              </p>
              <h1 id="landing-title">
                A sharper
                <br />
                <span>view of Epe.</span>
              </h1>
              <p className="landing-v3__lede">
                Independent journalism, public knowledge and a living record of
                the people and places shaping Epe Division.
              </p>
              <div className="landing-v3__actions">
                <a
                  className="landing-v3__button landing-v3__button--gold"
                  href={palette.newsroom}
                >
                  Read the latest news <span aria-hidden="true">↗</span>
                </a>
                <DownloadApp className="landing-v3__app-button" />
              </div>
            </div>
            <div
              className="landing-v3__hero-art"
              aria-label="Epe Lawa publication mark"
            >
              <div className="landing-v3__art-circle" />
              <div className="landing-v3__art-line landing-v3__art-line--one" />
              <div className="landing-v3__art-line landing-v3__art-line--two" />
              <div className="landing-v3__art-label">
                EL
                <br />
                <small>EST. / EPE</small>
              </div>
              <span className="landing-v3__art-caption">
                LOCAL / INDEPENDENT / ACCOUNTABLE
              </span>
            </div>
          </div>
          <div className="landing-v3__hero-footer">
            <span>Stories from home, made for everywhere.</span>
            <span>Scroll to explore ↓</span>
          </div>
        </Container>
      </section>

      <section className="landing-v3__trust" aria-label="Epe Lawa standards">
        <Container>
          <div className="landing-v3__trust-grid">
            <p>Good local journalism should make a place more legible.</p>
            <div>
              <strong>Independent</strong>
              <span>Editorially led</span>
            </div>
            <div>
              <strong>Source-led</strong>
              <span>Named and dated</span>
            </div>
            <div>
              <strong>Correctable</strong>
              <span>Accountable in public</span>
            </div>
          </div>
        </Container>
      </section>

      <section className="landing-v3__intro" aria-labelledby="intro-title">
        <Container>
          <div className="landing-v3__section-index">
            / 01 <span>About Epe Lawa</span>
          </div>
          <div className="landing-v3__intro-content">
            <p className="landing-v3__eyebrow">
              A publication with a point of view
            </p>
            <h2 id="intro-title">The story of Epe deserves a proper record.</h2>
            <p>
              We report the facts, people and ideas that shape Epe Division —
              with context, care and enough room for complexity.
            </p>
            <p>
              Epe Lawa is built for residents, neighbours and the wider world
              that wants to understand this place beyond a headline.
            </p>
          </div>
        </Container>
      </section>

      <section className="landing-v3__work" aria-labelledby="work-title">
        <Container>
          <div className="landing-v3__section-index landing-v3__section-index--light">
            / 02 <span>What we do</span>
          </div>
          <h2 id="work-title">
            One publication.
            <br />
            <em>Many ways in.</em>
          </h2>
          <div className="landing-v3__work-grid">
            {work.map(([number, title, copy, href]) => (
              <Link key={number} href={href} className="landing-v3__work-card">
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="landing-v3__coverage"
        aria-labelledby="coverage-title"
      >
        <Container>
          <div className="landing-v3__section-index">
            / 03 <span>Our coverage</span>
          </div>
          <div className="landing-v3__coverage-content">
            <p className="landing-v3__eyebrow">Close to the ground</p>
            <h2 id="coverage-title">
              The details
              <br />
              <em>make the place.</em>
            </h2>
            <p className="landing-v3__coverage-lede">
              From civic decisions to cultural memory, we follow the forces that
              give Epe its character.
            </p>
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

      <section className="landing-v3__cta" aria-labelledby="cta-title">
        <Container>
          <div className="landing-v3__cta-grid">
            <div>
              <p className="landing-v3__eyebrow">The newsroom is elsewhere</p>
              <h2 id="cta-title">
                Go where
                <br />
                <em>the story is.</em>
              </h2>
            </div>
            <div>
              <p>
                Our corporate home explains who we are. The latest reporting
                lives in the newsroom.
              </p>
              <a
                className="landing-v3__button landing-v3__button--dark"
                href={palette.newsroom}
              >
                Visit news.epelawa.ng <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="landing-v3__contact" aria-labelledby="contact-title">
        <Container>
          <div className="landing-v3__section-index landing-v3__section-index--light">
            / 04 <span>Work with us</span>
          </div>
          <div className="landing-v3__contact-grid">
            <div>
              <h2 id="contact-title">
                Bring us
                <br />
                <em>something real.</em>
              </h2>
            </div>
            <div className="landing-v3__contact-links">
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
