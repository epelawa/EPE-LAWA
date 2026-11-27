"use client";

import { liveBadges, type QueueCounts, type QueueKey } from "./use-live-queue-counts";

/**
 * Live notification dots for one navigation item (turn 24): a red count for
 * work waiting (messages, reports, submissions) and a pulsing green dot while
 * a job runs (AI, storage). Renders nothing when the item has nothing live.
 */
export default function LiveDots({ counts, href, flick, className = "" }: { counts: QueueCounts | null; href: string; flick?: QueueKey | null; className?: string }) {
  const badges = liveBadges(counts, href);
  if (!badges.length) return null;
  return <span className={`live-dots ${className}`.trim()}>
    {badges.map((badge) => badge.kind === "running"
      ? <span key={badge.key} className="live-dot live-dot--running" role="img" aria-label={badge.label} title={badge.label} />
      : <span key={badge.key} className={flick === badge.key ? "live-dot live-dot--count live-dot--hot" : "live-dot live-dot--count"} role="img" aria-label={badge.label} title={badge.label}>{badge.value > 99 ? "99+" : badge.value}</span>)}
  </span>;
}
