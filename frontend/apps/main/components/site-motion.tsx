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
    }, 1_800);
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
    if (!main || typeof IntersectionObserver === "undefined") return;

    // Observe server-rendered content without changing its attributes: this root
    // layout can mount while streamed route segments are still hydrating.
    const scheduled = new WeakSet<HTMLElement>();
    const activeAnimations = new Set<Animation>();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancelAnimationsForReducedMotion = () => {
      if (!motionPreference.matches) return;
      for (const animation of activeAnimations) animation.cancel();
      activeAnimations.clear();
    };
    motionPreference.addEventListener("change", cancelAnimationsForReducedMotion);

    const observer = new IntersectionObserver((entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        currentObserver.unobserve(target);
        if (motionPreference.matches || typeof target.animate !== "function") continue;

        const animation = target.animate(
          [
            { opacity: 0, filter: "blur(10px)", transform: "translate3d(0,22px,0) scale(.99)" },
            { opacity: 1, filter: "blur(0)", transform: "translate3d(0,0,0) scale(1)" },
          ],
          { duration: 680, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" },
        );
        activeAnimations.add(animation);
        animation.addEventListener("finish", () => {
          animation.cancel();
          activeAnimations.delete(animation);
        }, { once: true });
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    const collect = (root: Element) => {
      const candidates = new Set<HTMLElement>();
      if (root instanceof HTMLElement && root.matches(REVEAL_TARGETS)) candidates.add(root);
      root.querySelectorAll<HTMLElement>(REVEAL_TARGETS).forEach((element) => candidates.add(element));
      for (const element of candidates) {
        if (scheduled.has(element) || element.closest('[aria-busy="true"]')) continue;
        let ancestor = element.parentElement;
        let nested = false;
        while (ancestor && ancestor !== main) {
          if (scheduled.has(ancestor)) { nested = true; break; }
          ancestor = ancestor.parentElement;
        }
        if (nested) continue;
        scheduled.add(element);
        observer.observe(element);
      }
    };

    collect(main);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) collect(node);
      }
    });
    mutations.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      motionPreference.removeEventListener("change", cancelAnimationsForReducedMotion);
      for (const animation of activeAnimations) animation.cancel();
      activeAnimations.clear();
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
