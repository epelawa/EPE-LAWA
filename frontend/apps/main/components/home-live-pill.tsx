"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./home-live-pill.module.css";

type LatestPayload = { latest?: { state?: string; items?: { slug: string; publishedAt: string | null }[] } };

// A small pulsing pill that appears when fresh stories publish while the
// visitor is reading, and refreshes the page on tap. It stays quiet when the
// visitor prefers reduced motion — the page still updates on reload.
export default function HomeLivePill({ since, label = "story" }: { since: number; label?: string }) {
  const router = useRouter();
  const [fresh, setFresh] = useState(0);
  const known = useRef<string[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch("/api/live/home", { cache: "no-store" });
        if (response.ok && alive) {
          const data: LatestPayload = await response.json();
          if (data?.latest?.state === "ok" && Array.isArray(data.latest.items)) {
            const seen = new Set(known.current);
            const newer = data.latest.items.filter(
              item => item.publishedAt && Date.parse(item.publishedAt) > since && item.slug && !seen.has(item.slug),
            );
            setFresh(newer.length);
          }
        }
      } catch { /* the pill is best-effort; the page still works */ }
      if (alive) timer = setTimeout(poll, 60000);
    };
    timer = setTimeout(poll, 30000);
    return () => { alive = false; clearTimeout(timer); };
  }, [since]);
  if (fresh < 1) return null;
  return <button type="button" className={styles.pill} onClick={() => router.refresh()}>
    <span className={styles.dot} aria-hidden="true" />
    {fresh} new {label}{fresh === 1 ? "" : "s"} — tap to refresh
  </button>;
}
