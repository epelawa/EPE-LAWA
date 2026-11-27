"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./home-live-pill.module.css";

type LatestPayload = { latest?: { state?: string; items?: { slug: string; publishedAt: string | null }[] } };

const POLL_MS = 30_000;

/**
 * Live news: when stories publish while someone is reading, the list updates
 * by itself — no reload and nothing to tap. The server components re-render
 * in place (scroll position and anything being typed are kept), the new
 * stories glow for a few seconds, and a quiet "Just in" note is announced to
 * screen readers. It waits while the visitor is typing or the tab is hidden.
 */
export default function HomeLivePill({ since, label = "story" }: { since: number; label?: string }) {
  const router = useRouter();
  const [added, setAdded] = useState(0);
  const known = useRef<Set<string> | null>(null);
  const pending = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let hideNote: ReturnType<typeof setTimeout>;

    const typing = () => {
      const active = document.activeElement;
      return !!active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active as HTMLElement).isContentEditable);
    };

    const glow = (slugs: string[]) => {
      // Wait for the refreshed list to render, then mark the new story cards.
      window.setTimeout(() => {
        for (const slug of slugs) {
          for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href="/news/${CSS.escape(slug)}"]`))) {
            const card = (link.closest("article, li") as HTMLElement | null) ?? link;
            card.classList.add(styles.liveNew);
            window.setTimeout(() => card.classList.remove(styles.liveNew), 6000);
          }
        }
      }, 700);
    };

    const apply = () => {
      if (!pending.current.length || typing() || document.visibilityState !== "visible") return;
      const slugs = pending.current;
      pending.current = [];
      router.refresh();
      setAdded(slugs.length);
      glow(slugs);
      clearTimeout(hideNote);
      hideNote = setTimeout(() => setAdded(0), 8000);
    };

    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/live/home", { cache: "no-store" });
          if (response.ok && alive) {
            const data: LatestPayload = await response.json();
            const items = data?.latest?.state === "ok" && Array.isArray(data.latest.items) ? data.latest.items : null;
            if (items) {
              if (!known.current) {
                // First look: everything already published before this page rendered is known.
                known.current = new Set(items.filter((item) => !item.publishedAt || Date.parse(item.publishedAt) <= since).map((item) => item.slug));
              }
              const fresh = items.filter((item) => item.slug && !known.current!.has(item.slug) && item.publishedAt && Date.parse(item.publishedAt) > since);
              for (const item of fresh) known.current.add(item.slug);
              if (fresh.length) pending.current = [...pending.current, ...fresh.map((item) => item.slug)];
              apply();
            }
          }
        } catch { /* best-effort; the page still works */ }
      }
      if (alive) timer = setTimeout(poll, POLL_MS);
    };

    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void poll(); } };
    const onBlur = () => window.setTimeout(apply, 50);
    timer = setTimeout(poll, 15_000);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("focusout", onBlur);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(hideNote);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("focusout", onBlur);
    };
  }, [since, router]);

  return <p className={styles.note} role="status" aria-live="polite" data-visible={added > 0 ? "true" : "false"}>
    {added > 0 ? <><span className={styles.dot} aria-hidden="true" /><strong>Just in</strong> · {added} {added === 1 ? `new ${label} added` : `new ${label === "story" ? "stories" : `${label}s`} added`}</> : null}
  </p>;
}
