"use client";

import { useEffect, useState } from "react";
import styles from "./reader-presence.module.css";

function sessionHash(): string {
  try {
    const existing = sessionStorage.getItem("epe-presence-id");
    if (existing && /^[a-f0-9]{16,64}$/.test(existing)) return existing;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hash = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("epe-presence-id", hash);
    return hash;
  } catch { return ""; }
}

export default function ReaderPresence({ slug }: { slug: string }) {
  const [reading, setReading] = useState(0);
  const [state, setState] = useState<"quiet" | "live" | "hidden">("quiet");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setState("hidden"); return; }
    const hash = sessionHash();
    if (!hash) { setState("hidden"); return; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const beat = async () => {
      try {
        const response = await fetch("/api/live/presence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, path: window.location.pathname, sessionHash: hash }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("unavailable");
        const data: { reading?: number; state?: string } = await response.json();
        if (!alive) return;
        if (typeof data?.reading === "number" && data.reading > 0) {
          setReading(data.reading);
          setState("live");
        } else {
          setState(data?.state === "ok" ? "hidden" : "hidden");
        }
      } catch { if (alive) setState("hidden"); }
      if (alive) timer = setTimeout(beat, 45000);
    };
    beat();
    return () => { alive = false; clearTimeout(timer); };
  }, [slug]);

  if (state !== "live") return null;
  return <span className={styles.pill} role="status" aria-live="polite">
    <span className={styles.dot} aria-hidden="true" />
    {reading} {reading === 1 ? "person" : "people"} reading now
  </span>;
}
