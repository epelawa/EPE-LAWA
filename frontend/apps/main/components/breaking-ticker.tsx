"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { newsArticlePath } from "../lib/news-urls";
import { tickerStamp } from "../lib/ticker-time";
import styles from "./home-breaking-ticker.module.css";

export type TickerStory = { slug: string; title: string; published_at: string | null; breaking_until: string | null };

/** About 9 seconds per headline, never faster than the old 18s strip. */
export function tickerDuration(count: number): number {
  return Math.max(18, Math.round(count * 9));
}

/**
 * The one breaking-news strip, shared by the home page and the news page.
 * `stories` must already be filtered to the live ones. The list is rendered
 * twice (the copy is hidden from assistive tech and keyboard) so the scroll
 * loops without a gap.
 */
export function BreakingTicker({ stories, className = "", arrived = false }: { stories: TickerStory[]; className?: string; arrived?: boolean }) {
  if (!stories.length) return null;
  const items = (copy: boolean) => stories.map((story) => {
    const stamp = tickerStamp(story.published_at);
    return <li key={story.slug}>
      {stamp ? <time dateTime={story.published_at ?? undefined}>{stamp}</time> : null}
      <Link href={newsArticlePath(story.slug)} tabIndex={copy ? -1 : undefined}>{story.title}</Link>
    </li>;
  });
  const style = { "--ticker-duration": `${tickerDuration(stories.length)}s` } as CSSProperties;
  return <section className={`${styles.banner} ${arrived ? styles.arrived : ""} ${className}`.trim()} aria-label="Breaking news" data-flash={arrived ? "1" : undefined} data-count={stories.length}>
    <div className={styles.label}>
      <span className={styles.pulse} aria-hidden="true" />
      <span className={styles.labelText}>Breaking</span>
      <span className={styles.count} aria-label={`${stories.length} breaking ${stories.length === 1 ? "story" : "stories"}`}>{stories.length}</span>
    </div>
    <div className={styles.viewport}>
      <div className={styles.track} style={style}>
        <ul className={styles.items}>{items(false)}</ul>
        <ul className={`${styles.items} ${styles.duplicate}`} aria-hidden="true">{items(true)}</ul>
      </div>
    </div>
  </section>;
}
