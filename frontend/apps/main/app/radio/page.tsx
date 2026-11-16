import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { ArrowRightIcon, RadioIcon } from "../../components/icons";
import { PageFrame } from "../../components/design-system";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Listen to Radio Lagos 107.5 FM on EPE LAWA.", path: "/radio" });

const listeningPerks = [
  ["Auto-start attempt", "The player starts itself when your browser permits audio."],
  ["One-tap fallback", "If autoplay is blocked, one Play tap starts the official stream."],
  ["Official station", "Listen to the named Radio Lagos 107.5 FM catalogue stream."],
  ["Live status", "The player says when it is connecting, playing, paused or unavailable."],
  ["Connection honesty", "A failed stream never appears as a live broadcast."],
  ["Mute control", "Silence the stream instantly without losing your volume setting."],
  ["Volume slider", "Set a comfortable listening level with a native accessible control."],
  ["Keyboard ready", "Play, pause, mute and volume controls work without a mouse."],
  ["Screen-reader status", "Playback changes are announced through a live status region."],
  ["No account needed", "Listening is open to visitors; sign-in is not required."],
  ["No invented show", "We do not display a presenter or programme that is not in the data."],
  ["Listen-page fallback", "Open the station’s external listening page if the stream needs help."],
  ["Programme archive", "Browse published programmes and episodes when they are available."],
  ["Schedule space", "Keep upcoming schedule information separate from the live player."],
  ["Reminders", "Open the reminder settings when you want an opt-in notification."],
  ["News connection", "Move from the broadcast to the latest EPE LAWA reporting."],
  ["Responsive layout", "The player remains usable on small phones and wide screens."],
  ["Reduced motion", "The interface avoids essential motion for reduced-motion preferences."],
  ["Fast controls", "The main action stays visible without making you hunt through the page."],
  ["Community focus", "A simple front door for Epe stories, sound and local connection."],
] as const;

export default function RadioPage() {
  return <PageFrame className={styles.listeningPage}>
    <section className={styles.hero} aria-labelledby="radio-page-title">
      <div className={styles.introCopy}>
        <p className={styles.eyebrow}>EPE LAWA RADIO <span aria-hidden="true">/</span> 107.5 FM</p>
        <h1 id="radio-page-title">Listen live<span>.</span></h1>
        <p>Turn up the sound of Lagos. Radio Lagos 107.5 FM is the verified station stream in this player; if your browser blocks automatic playback, tap Play once.</p>
        <div className={styles.heroActions}><Link className="btn-primary" href="#live-player">Listen now <ArrowRightIcon size={17} aria-hidden="true" /></Link><Link className="btn-secondary" href="/radio/programmes">Explore programmes</Link></div>
      </div>
      <div className={styles.heroSide} aria-hidden="true"><div className={styles.introMark}><RadioIcon size={64} /></div><span className={styles.signal}>ON AIR<br /><strong>107.5 FM</strong></span></div>
    </section>

    <section id="live-player" className={styles.playerWrap} aria-label="Radio Lagos live player"><RadioPlayer /></section>

    <section className={styles.perksSection} aria-labelledby="radio-perks-title">
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>A BETTER LISTENING DESK</p><h2 id="radio-perks-title">Small details, made for listening.</h2><p>Everything here is designed to make the live player clear, useful and honest about what the broadcast can currently provide.</p></div>
      <ul className={styles.perksGrid}>{listeningPerks.map(([title, description], index) => <li key={title}><span className={styles.perkNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul>
    </section>

    <section className={styles.explore} aria-labelledby="radio-explore-title">
      <div><p className={styles.eyebrow}>MORE FROM EPE LAWA</p><h2 id="radio-explore-title">Keep exploring</h2></div>
      <div className={styles.links}>
        <Link href="/radio/programmes"><span><strong>Programmes &amp; archive</strong><small>Explore published radio content</small></span><ArrowRightIcon size={20} aria-hidden="true" /></Link>
        <Link href="/radio/reminders"><span><strong>Radio reminders</strong><small>Choose whether you want listening reminders</small></span><ArrowRightIcon size={20} aria-hidden="true" /></Link>
        <Link href="/news"><span><strong>Latest news</strong><small>Read stories from the newsroom</small></span><ArrowRightIcon size={20} aria-hidden="true" /></Link>
      </div>
    </section>
  </PageFrame>;
}
