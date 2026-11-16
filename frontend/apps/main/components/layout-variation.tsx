"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./layout-variation.css";

/** Pair the article and member treatments. A repeat visit to either starts a new pair. */
export default function LayoutVariation({ children, area }: { children: ReactNode; area: "member" | "article" }) {
  const [variant, setVariant] = useState(0);
  useEffect(() => {
    let next = Math.floor(Math.random() * 4);
    try {
      const key = "epe-layout-pair-v1";
      const saved = JSON.parse(sessionStorage.getItem(key) || "null") as { variant?: unknown; seen?: unknown } | null;
      const valid = saved && Number.isInteger(saved.variant) && Number(saved.variant) >= 0 && Number(saved.variant) < 4 && Array.isArray(saved.seen);
      let seen: string[] = [];
      if (valid && saved && Array.isArray(saved.seen)) {
        const previous = Number(saved.variant);
        if (!saved.seen.includes(area)) {
          next = previous;
          seen = saved.seen.filter((value: unknown): value is string => value === "article" || value === "member");
        } else if (next === previous) {
          next = (next + 1) % 4;
        }
      }
      sessionStorage.setItem(key, JSON.stringify({ variant: next, seen: [...seen, area] }));
    } catch { /* Storage is optional; content and permissions do not depend on it. */ }
    setVariant(next);
  }, [area]);
  return <div className="layout-variation" data-layout-area={area} data-layout-variant={variant}>{children}</div>;
}
