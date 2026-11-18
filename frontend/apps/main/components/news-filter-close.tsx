"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep the native disclosure keyboard accessible while dismissing it predictably. */
export default function NewsFilterClose({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const container = root.current;
      if (!container || !(event.target instanceof Node) || container.contains(event.target)) return;
      const details = container.querySelector("details");
      if (details) details.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, []);

  return <div ref={root} onClick={(event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("a")) return;
    const details = target.closest("details");
    if (details) details.open = false;
  }} onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const details = target.closest("details");
    if (details?.open) { details.open = false; details.querySelector("summary")?.focus(); event.stopPropagation(); }
  }}>{children}</div>;
}
