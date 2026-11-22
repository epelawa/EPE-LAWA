"use client";

import { useEffect, useRef, useState } from "react";

export type QueueCounts = {
  submissions: number | null;
  corrections: number | null;
  enquiries: number | null;
  events: number | null;
  songRequests: number | null;
  appeals: number | null;
  forumReports: number | null;
};

export type QueueKey = keyof QueueCounts;

const EMPTY: QueueCounts = {
  submissions: null,
  corrections: null,
  enquiries: null,
  events: null,
  songRequests: null,
  appeals: null,
  forumReports: null,
};

/** Polls the live moderation queues. Fetches immediately, then every 45s. */
export function useLiveQueueCounts(pollMs = 45000) {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const previous = useRef<QueueCounts | null>(null);
  const [flick, setFlick] = useState<QueueKey | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const poll = async () => {
      try {
        const response = await fetch("/api/live/queues", { cache: "no-store" });
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
            setTimeout(() => setFlick(null), 1600);
          }
        }
      } catch { /* keep the last known counts */ }
      if (alive) timer = setTimeout(poll, pollMs);
    };
    void poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [pollMs]);

  return { counts, flick };
}
