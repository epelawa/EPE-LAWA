import type { ReactNode } from "react";

/**
 * Wraps a home section in the shared section container. Purely structural:
 * content paints immediately with no entrance animation, and the class keeps
 * the content-visibility perf hint from globals.css.
 */
export function HomeSectionReveal({ children }: { children: ReactNode }) {
  return <div className="home-section-reveal">{children}</div>;
}
