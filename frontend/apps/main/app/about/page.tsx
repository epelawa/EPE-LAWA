import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/metadata";
import { PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, TextLink } from "../../components/design-system";
import styles from "./about.module.css";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "About EPE LAWA, a shared web home for news, history, conversation, discovery and local life in Epe Division.",
  path: "/about",
});

const destinations = [
  { href: "/news", label: "News", description: "Published local stories when they are available." },
  { href: "/itan-ilu-mi", label: "Community history", description: "Sourced memories and records, carefully reviewed." },
  { href: "/tourism", label: "Tourism", description: "Places and visitor information from approved sources." },
  { href: "/business-directory", label: "Local businesses", description: "A directory for useful local discovery." },
  { href: "/forum", label: "Community conversation", description: "The Digital Village Square for verified members." },
  { href: "/radio", label: "EPE LAWA Radio", description: "Listening access with honest stream and programme states." },
];

export default function AboutPage() {
  return (
    <PageFrame className={styles.page}>
      <PageIntro
        eyebrow="About EPE LAWA"
        title={<>Our place.<br />A shared perspective.</>}
        description="A web home for people in Epe Division, Lagos State, and everyone connected to the community."
        actions={<TextLink href="/news">Explore the latest</TextLink>}
      />

      <section className={styles.mission} aria-labelledby="mission-title">
        <div className={styles.missionLead}>
          <p className="ui-eyebrow">Why it exists</p>
          <h2 id="mission-title">Useful local knowledge should feel close, clear and considered.</h2>
        </div>
        <div className={`${styles.missionCopy} ui-prose`}>
          <p>EPE LAWA brings together local news, Ìtàn Ilú Mi community history, the Digital Village Square, map and navigation, local businesses, tourism, radio, and Who is Who in Epe.</p>
          <p>We make room for discovery and participation without filling gaps with guesses. Information and listings appear when they are approved; private contributions stay private while they are reviewed.</p>
        </div>
      </section>

      <section className={styles.destinationSection} aria-labelledby="destination-title">
        <SectionHeading
          eyebrow="Find your way around"
          title="One community, several useful paths."
          description="Start with the area that helps you today. Availability varies by approved records and configured services."
        />
        <div className={styles.destinationGrid}>
          {destinations.map((destination) => (
            <Link className={styles.destinationCard} href={destination.href} key={destination.href}>
              <span className={styles.destinationLabel}>{destination.label}</span>
              <span className={styles.destinationDescription}>{destination.description}</span>
              <span className={styles.destinationArrow} aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="ui-split">
        <Panel>
          <SectionHeading eyebrow="Our standard" title="Built with care." />
          <div className="ui-prose">
            <p>Clear sources, thoughtful discussion and respect for private information guide the work. Public pages use approved records, and unknown details remain unknown rather than being invented.</p>
            <p>The people behind EPE LAWA are its founding team. Editorial staff details will appear here once confirmed.</p>
          </div>
          <div className="ui-actions">
            <TextLink href="/guidelines">Read our guidelines</TextLink>
            <TextLink href="/privacy">How your data is handled</TextLink>
          </div>
        </Panel>
        <aside className="ui-sidebar">
          <Panel className="ui-subtle">
            <SectionHeading title="Want to reach the team?" />
            <p className="ui-muted">Contact is currently informational only. It does not receive or store messages.</p>
            <TextLink href="/contact">View contact availability</TextLink>
          </Panel>
          <Panel className="ui-stack-sm">
            <div className="ui-row">
              <h2>Correction requests</h2>
              <StatusBadge tone="warning">Coming Soon</StatusBadge>
            </div>
            <p className="ui-muted">A secure correction or removal-request channel is not available yet. Please do not send private details or rely on Contact as a report intake.</p>
          </Panel>
        </aside>
      </div>
    </PageFrame>
  );
}
