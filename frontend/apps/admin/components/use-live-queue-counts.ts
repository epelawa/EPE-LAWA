"use client";

import { useEffect, useRef, useState } from "react";

const QUEUE_URL = process.env.NEXT_PUBLIC_STANDALONE_ADMIN === "true" ? "/admin/api/live/queues" : "/api/live/queues";

export type QueueCounts = {
  submissions: number | null;
  corrections: number | null;
  articleCorrections: number | null;
  enquiries: number | null;
  events: number | null;
  appeals: number | null;
  forumReports: number | null;
  commentReports: number | null;
  aiEscalations: number | null;
  aiRunning: number | null;
  storageRunning: number | null;
};

export type QueueKey = keyof QueueCounts;

/**
 * Which navigation item shows which live dot. "count" dots carry the number of
 * items waiting; "running" dots pulse while a job is in progress.
 */
export type QueueBadge = { key: QueueKey; kind: "count" | "running"; label: (n: number) => string };
const waiting = (noun: string, plural = `${noun}s`) => (n: number) => `${n} ${n === 1 ? noun : plural} waiting`;
export const QUEUE_BADGES: Record<string, QueueBadge[]> = {
  "/business-review": [{ key: "submissions", kind: "count", label: waiting("business submission") }],
  "/people": [{ key: "corrections", kind: "count", label: waiting("profile correction") }],
  "/corrections": [{ key: "articleCorrections", kind: "count", label: waiting("correction report") }],
  "/enquiries": [{ key: "enquiries", kind: "count", label: waiting("new message") }],
  "/events": [{ key: "events", kind: "count", label: waiting("event submission") }],
  "/appeals": [{ key: "appeals", kind: "count", label: waiting("appeal") }],
  "/moderation/forum": [{ key: "forumReports", kind: "count", label: waiting("forum report") }],
  "/moderation/comments": [{ key: "commentReports", kind: "count", label: waiting("comment report") }],
  "/ai-processes": [
    { key: "aiRunning", kind: "running", label: (n) => `${n} AI ${n === 1 ? "job" : "jobs"} running now` },
    { key: "aiEscalations", kind: "count", label: (n) => `${n} AI ${n === 1 ? "decision needs" : "decisions need"} a human` },
  ],
  "/storage": [{ key: "storageRunning", kind: "running", label: () => "Storage clean-up or compression running" }],
};

/** The dots to draw for one navigation item, in display order (empty when nothing is live). */
export function liveBadges(counts: QueueCounts | null, href: string): { kind: "count" | "running"; value: number; label: string; key: QueueKey }[] {
  if (!counts) return [];
  return (QUEUE_BADGES[href] ?? []).flatMap((badge) => {
    const value = counts[badge.key];
    return typeof value === "number" && value > 0 ? [{ kind: badge.kind, value, label: badge.label(value), key: badge.key }] : [];
  });
}

/** Something anywhere needs attention: used for the dot on the menu button. */
export function anyLive(counts: QueueCounts | null): boolean {
  return !!counts && Object.values(QUEUE_BADGES).flat().some((badge) => (counts[badge.key] ?? 0) > 0);
}

/** Polls the live queues and jobs. Fetches immediately, then every 30s (and when the tab comes back). */
export function useLiveQueueCounts(pollMs = 30000, enabled = true) {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const previous = useRef<QueueCounts | null>(null);
  const [flick, setFlick] = useState<QueueKey | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let flickTimer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const poll = async () => {
      try {
        const response = await fetch(QUEUE_URL, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const data: { queues?: QueueCounts } = await response.json();
        if (!alive || !data?.queues) return;
        const next = data.queues;
        const before = previous.current;
        previous.current = next;
        setCounts(next);
        if (before && !reduce) {
          const changed = (Object.keys(next) as QueueKey[]).find(
            (key) => typeof next[key] === "number" && (before[key] === null || (before[key] as number) !== (next[key] as number)),
          );
          if (changed) {
            setFlick(changed);
            clearTimeout(flickTimer);
            flickTimer = setTimeout(() => setFlick(null), 1600);
          }
        }
      } catch { /* keep the last known counts */ }
      if (alive) { clearTimeout(timer); timer = setTimeout(poll, pollMs); }
    };
    void poll();
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void poll(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; controller.abort(); clearTimeout(timer); clearTimeout(flickTimer); document.removeEventListener("visibilitychange", onVisible); };
  }, [pollMs, enabled]);

  return { counts, flick };
}
