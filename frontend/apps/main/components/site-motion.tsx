"use client";

import { useEffect, useState } from "react";

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
