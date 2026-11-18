import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { ArrowRightIcon } from "../../components/icons";
import { PageFrame } from "../../components/design-system";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Listen to Radio Lagos and discover Guts FM on EPE LAWA.", path: "/radio" });
export default function RadioPage() {
  return <PageFrame className={styles.listeningPage}>
    <section className={styles.hero} aria-labelledby="radio-page-title">
      <div className={styles.introCopy}><p className={styles.eyebrow}>EPE LAWA / RADIO</p><h1 id="radio-page-title">Your sound.<br/><span>Your community.</span></h1><p>News, voices and music from the places we call home. Choose a station and tune in.</p><div className={styles.heroActions}><Link className="btn-primary" href="#live-player">Start listening <ArrowRightIcon size={17} /></Link><Link className="btn-secondary" href="/radio/programmes">Explore programmes</Link></div></div>
      <div className={styles.heroSide} aria-hidden="true"><div className={styles.introMark}><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 24 49 10M12 24h40a4 4 0 0 1 4 4v23a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V28a4 4 0 0 1 4-4Z"/><circle cx="22" cy="39" r="7"/><path d="M37 34h10M37 40h10M37 46h10"/></svg></div><span>THE SOUND OF HOME</span></div>
    </section>
    <section id="live-player" className={styles.playerWrap} aria-label="Radio stations"><RadioPlayer /></section>
    <section className={styles.explore} aria-labelledby="radio-explore-title"><div><p className={styles.eyebrow}>MORE FROM EPE LAWA</p><h2 id="radio-explore-title">Keep exploring</h2></div><div className={styles.links}>
      <Link href="/radio/programmes"><span><strong>Programmes &amp; archive</strong><small>Explore published radio content</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/radio/reminders"><span><strong>Radio reminders</strong><small>Choose your listening reminders</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/news"><span><strong>Latest news</strong><small>Stories from the newsroom</small></span><ArrowRightIcon size={20} /></Link>
    </div></section>
  </PageFrame>;
}
