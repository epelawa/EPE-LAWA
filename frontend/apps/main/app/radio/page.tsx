import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { ArrowRightIcon } from "../../components/icons";
import { PageFrame } from "../../components/design-system";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";
import SponsorSlot from "../../components/sponsor-slot";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Listen to Radio Lagos and discover Guts FM on EPE LAWA.", path: "/radio" });
export default function RadioPage() {
  return <PageFrame className={styles.listeningPage}>
    <section id="live-player" className={styles.playerWrap} aria-label="Radio stations"><RadioPlayer><SponsorSlot compact /></RadioPlayer></section>
    <section className={styles.explore} aria-labelledby="radio-explore-title"><div><p className={styles.eyebrow}>MORE FROM EPE LAWA</p><h2 id="radio-explore-title">Keep exploring</h2></div><div className={styles.links}>
      <Link href="/radio/programmes"><span><strong>Programmes &amp; archive</strong><small>Explore published radio content</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/radio/reminders"><span><strong>Radio reminders</strong><small>Choose your listening reminders</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/news"><span><strong>Latest news</strong><small>Stories from the newsroom</small></span><ArrowRightIcon size={20} /></Link>
    </div></section>
  </PageFrame>;
}
