"use client";

import { useEffect, useState } from "react";
import styles from "./forum.module.css";

type ThreadRows = { last_activity_at?: string | null }[];

// Live indicator: polls the public forum feed and shows how many
// conversations had activity in the last 15 minutes.
export default function ForumLiveCount({ initialActive }: { initialActive: number }) {
  const [active, setActive] = useState(initialActive);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch("/api/live/forum", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data: { active?: number } = await response.json();
        if (alive && typeof data?.active === "number") setActive(data.active);
      } catch { /* keep the last known count */ }
      if (alive) timer = setTimeout(poll, 60000);
    };
    timer = setTimeout(poll, 60000);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  if (active < 1) return null;
  return <span className={styles.liveBadge}><span className={styles.liveDot} aria-hidden="true" />{active} active now</span>;
}

export function countActive(threads: ThreadRows, windowMs = 15 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return threads.filter(thread => thread.last_activity_at && Date.parse(thread.last_activity_at) > cutoff).length;
}
