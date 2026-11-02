"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals a block as it enters the viewport.
 *
 * Deliberately restrained: it fades and lifts 12px, once, and then stops. No parallax, no
 * staggered emoji, no scroll-jacking. If `prefers-reduced-motion` is set, the element is
 * visible from the start and no observer is attached at all.
 *
 * The element is visible in the DOM from the first paint — this only changes opacity and
 * transform, so the content is present for search engines and for anyone with JavaScript
 * disabled.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  /** Milliseconds. Keep it under 120; anything slower feels like waiting. */
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    // A browser without IntersectionObserver gets the content, not a blank box.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${className}`.trim()}
      data-visible={visible ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
