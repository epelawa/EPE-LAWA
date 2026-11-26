"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { newsArticlePath } from "../lib/news-urls";
import { tickerStamp } from "../lib/ticker-time";
import { StatusBadge } from "./design-system";
import tickerStyles from "./home-breaking-ticker.module.css";

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
  return <section className={`${tickerStyles.banner} ${tickerStyles.narrow}`} aria-label="Breaking news">
    <div className={tickerStyles.label}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10v4h4l10 5V5L7 10H3ZM7 14l2 6h3l-1.5-4.5M20 9v6"/></svg><span>Breaking news</span></div>
    <div className={tickerStyles.viewport}>
      <div className={tickerStyles.track}>
        <ul className={tickerStyles.items}>{active.map(story => <li key={story.slug}>{tickerStamp(story.published_at) ? <time dateTime={story.published_at ?? undefined}>{tickerStamp(story.published_at)}</time> : null}<Link href={newsArticlePath(story.slug)}>{story.title}</Link></li>)}</ul>
        <ul className={`${tickerStyles.items} ${tickerStyles.duplicate}`} aria-hidden="true">{active.map(story => <li key={story.slug}>{tickerStamp(story.published_at) ? <time dateTime={story.published_at ?? undefined}>{tickerStamp(story.published_at)}</time> : null}<Link href={newsArticlePath(story.slug)} tabIndex={-1}>{story.title}</Link></li>)}</ul>
      </div>
    </div>
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
