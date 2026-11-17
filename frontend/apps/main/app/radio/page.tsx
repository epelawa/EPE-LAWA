import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { ArrowRightIcon, RadioIcon } from "../../components/icons";
import { PageFrame } from "../../components/design-system";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Listen to Radio Lagos 107.5 FM on EPE LAWA.", path: "/radio" });

export default function RadioPage() {
  return <PageFrame className={styles.listeningPage}>
    <div className={styles.intro}>
      <div className={styles.introCopy}>
        <p className={styles.eyebrow}>EPE LAWA RADIO <span aria-hidden="true">/</span> 107.5 FM</p>
        <h1>Listen live<span>.</span></h1>
        <p>Stay connected to the sounds and stories of Lagos with Radio Lagos 107.5 FM.</p>
      </div>
      <div className={styles.introMark} aria-hidden="true"><RadioIcon size={64} /></div>
    </div>
    <div className={styles.playerWrap}><RadioPlayer /></div>
    <div className={styles.explore}>
      <div><p className={styles.eyebrow}>MORE FROM EPE LAWA</p><h2>Keep exploring</h2></div>
      <div className={styles.links}>
        <Link href="/radio/programmes"><span><strong>Programmes &amp; archive</strong><small>Explore published radio content</small></span><ArrowRightIcon size={20} aria-hidden="true" /></Link>
        <Link href="/news"><span><strong>Latest news</strong><small>Read stories from the newsroom</small></span><ArrowRightIcon size={20} aria-hidden="true" /></Link>
      </div>
    </div>
  </PageFrame>;
}
