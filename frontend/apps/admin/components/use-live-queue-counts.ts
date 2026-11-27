"use client";

import { useEffect, useRef, useState } from "react";

const QUEUE_URL = process.env.NEXT_PUBLIC_STANDALONE_ADMIN === "true" ? "/admin/api/live/queues" : "/api/live/queues";

export type QueueCounts = {
  submissions: number | null;
  corrections: number | null;
  enquiries: number | null;
  appeals: number | null;
  forumReports: number | null;
};

export type QueueKey = keyof QueueCounts;

/** Polls the live moderation queues. Fetches immediately, then every 45s. */
export function useLiveQueueCounts(pollMs = 45000) {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const previous = useRef<QueueCounts | null>(null);
  const [flick, setFlick] = useState<QueueKey | null>(null);

  useEffect(() => {
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
      if (alive) timer = setTimeout(poll, pollMs);
    };
    void poll();
    return () => { alive = false; controller.abort(); clearTimeout(timer); clearTimeout(flickTimer); };
  }, [pollMs]);

  return { counts, flick };
}
