"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { newsArticlePath } from "../lib/news-urls";
import { StatusBadge } from "./design-system";
import styles from "../app/news/listing.module.css";

type BreakingStory = { slug: string; title: string; published_at: string | null; breaking_until: string | null };

// Start with the server's timestamp to avoid hydration mismatches. After hydration,
// recheck at each expiry so an open page does not keep advertising stale news.
function useCurrentTime(initialTime: number, expiries: (string | null)[]) {
  const [now, setNow] = useState(initialTime);
  const key = expiries.join("|");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const current = Date.now();
      setNow(current);
      const next = key.split("|").map(value => Date.parse(value)).filter(value => Number.isFinite(value) && value > current).sort((a, b) => a - b)[0];
      if (next !== undefined) timer = setTimeout(schedule, Math.min(next - current + 1, 2147483647));
    }
    function refresh() { clearTimeout(timer); schedule(); }
    schedule();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [key]);
  return now;
}

export function BreakingNewsBanner({ stories, initialTime }: { stories: BreakingStory[]; initialTime: number }) {
  const now = useCurrentTime(initialTime, stories.map(story => story.breaking_until));
  const active = stories.filter(story => story.breaking_until && Date.parse(story.breaking_until) > now);
  if (!active.length) return null;
  return <section className={styles.breakingBanner} aria-label="Breaking news">
    <span className={styles.breakingLabel}><span aria-hidden="true" className={styles.liveDot} /> Breaking news</span>
    <ul>{active.map(story => <li key={story.slug}><Link href={newsArticlePath(story.slug)}>{story.title}</Link>{story.published_at ? <time dateTime={story.published_at}>{new Date(story.published_at).toUTCString()}</time> : null}</li>)}</ul>
  </section>;
}

export function BreakingBadge({ until, initialTime }: { until: string | null; initialTime: number }) {
  const now = useCurrentTime(initialTime, [until]);
  return until && Date.parse(until) > now ? <StatusBadge tone="warning">Breaking</StatusBadge> : null;
}

/** Used by the member feed so already-rendered cards also disappear at expiry. */
export function ExpiringBreakingList({ items, initialTime, className, emptyClassName }: { items: { id: string; until: string | null; content: ReactNode }[]; initialTime: number; className: string; emptyClassName: string }) {
  const now = useCurrentTime(initialTime, items.map(item => item.until));
  const active = items.filter(item => item.until && Date.parse(item.until) > now);
  return active.length ? <div className={className}>{active.map(item => <Fragment key={item.id}>{item.content}</Fragment>)}</div> : <p className={emptyClassName}>There are no active breaking stories right now.</p>;
}
