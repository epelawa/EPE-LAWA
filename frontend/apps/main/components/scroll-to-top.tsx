"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Every route starts at the top of the page.
 *
 * Next.js restores the previous scroll offset in some client transitions and
 * the browser restores it on back/forward. Both behaviours can drop a reader
 * beside the footer of a newly opened page. This guard keeps navigation
 * predictable: a new pathname, or a history traversal, always starts at 0.
 * Query-string changes (for example the dashboard tabs) are deliberately left
 * alone so switching tabs does not throw away the reader's place.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname ?? "/");

  useLayoutEffect(() => {
    const current = pathname ?? "/";
    const changed = current !== lastPathname.current;
    lastPathname.current = current;
    // Fragment links (including comment links) intentionally keep their target.
    if (window.location.hash || (!changed && current !== "/news")) return;
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    reset();
    // Next's own navigation scroll can run after React commits the new route.
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof history === "undefined") return;
    const previous = "scrollRestoration" in history ? history.scrollRestoration : null;
    if (previous) history.scrollRestoration = "manual";

    const reset = () => { if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" }); };
    // `popstate` fires for back/forward. The animation frame lets the browser
    // finish its own restoration pass before we override it.
    const onPopState = () => window.requestAnimationFrame(reset);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (previous) history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
