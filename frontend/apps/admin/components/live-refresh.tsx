"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-renders the page from the server every few seconds while something is running. */
export default function LiveRefresh({ active, seconds = 3 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!active || paused) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [active, paused, router, seconds]);
  if (!active) return null;
  return (
    <p className="ui-meta" role="status" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: paused ? "#9aa5b1" : "#16a34a", boxShadow: paused ? "none" : "0 0 0 4px rgba(22,163,74,.18)" }} />
      {paused ? "Live updates paused." : `Live — updates every ${seconds} seconds.`}
      <button type="button" className="btn-secondary" style={{ minHeight: 36, padding: "6px 14px" }} onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
    </p>
  );
}
