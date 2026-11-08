"use client";

import { useEffect, useState } from "react";

const REVEAL_TARGETS = [
  "main section",
  "main article",
  "main .ui-page > *",
  "main .home-hero__copy",
  "main .home-hero__art",
  "main .home-feature",
  "main .home-index__link",
  "main .home-story",
  "main .home-community > *",
  "main .home-join",
].join(",");

type LoaderProps = { label?: string };

export function TidegateSpinner({ label = "Loading EPE LAWA" }: LoaderProps) {
  return (
    <span className="tidegate-spinner" role="status" aria-live="polite" aria-label={label}>
      <span className="tidegate-spinner__outer" aria-hidden="true" />
      <span className="tidegate-spinner__inner" aria-hidden="true" />
      <span className="tidegate-spinner__keel" aria-hidden="true" />
    </span>
  );
}

export default function SiteMotion() {
  const [phase, setPhase] = useState<"loading" | "exiting" | "done">("loading");

  useEffect(() => {
    const startedAt = performance.now();
    let safetyTimer = 0;
    let finishTimer = 0;
    let exitTimer = 0;
    const finish = () => {
      window.clearTimeout(safetyTimer);
      const remaining = Math.max(0, 360 - (performance.now() - startedAt));
      finishTimer = window.setTimeout(() => {
        setPhase("exiting");
        exitTimer = window.setTimeout(() => setPhase("done"), 180);
      }, remaining);
    };
    const onLoad = () => finish();
    safetyTimer = window.setTimeout(() => {
      window.removeEventListener("load", onLoad);
      setPhase("exiting");
      exitTimer = window.setTimeout(() => setPhase("done"), 180);
    }, 1800);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(safetyTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".site-main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.scrollReveal = "visible";
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    const collect = (root: Element) => {
      const candidates = new Set<HTMLElement>();
      if (root instanceof HTMLElement && root.matches(REVEAL_TARGETS)) candidates.add(root);
      root.querySelectorAll<HTMLElement>(REVEAL_TARGETS).forEach((element) => candidates.add(element));
      for (const element of candidates) {
        if (element.dataset.scrollReveal || element.closest('[aria-busy="true"]')) continue;
        let ancestor = element.parentElement;
        let nested = false;
        while (ancestor && ancestor !== main) {
          if (ancestor.dataset.scrollReveal) { nested = true; break; }
          ancestor = ancestor.parentElement;
        }
        if (nested) continue;
        element.dataset.scrollReveal = "pending";
        observer.observe(element);
      }
    };

    collect(main);
    document.documentElement.classList.add("has-scroll-reveal");
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) collect(node);
      }
    });
    mutations.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.documentElement.classList.remove("has-scroll-reveal");
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div className="site-preloader" data-phase={phase} aria-hidden={phase === "exiting"}>
      <div className="site-preloader__content">
        <TidegateSpinner label="Loading EPE LAWA" />
        <p className="site-preloader__label">Preparing EPE LAWA</p>
      </div>
    </div>
  );
}
