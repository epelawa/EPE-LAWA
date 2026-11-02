"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPullRefreshEnabled, isPullRefreshGesture, probeConnection } from "../lib/connectivity";

type Notice = "offline" | "checking" | "online" | "unreachable" | null;
type Reason = "online" | "retry" | "pull";

export default function Connectivity() {
  const router = useRouter();
  const pathname = usePathname();
  const pullEnabled = isPullRefreshEnabled(pathname);
  const [notice, setNotice] = useState<Notice>(null);
  const [pull, setPull] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const dismissal = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async (reason: Reason) => {
    if (dismissal.current) clearTimeout(dismissal.current);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    if (!navigator.onLine) { setNotice("offline"); return; }
    setNotice("checking");
    // A real same-origin request, not a claim that unpublished content synced.
    const result = await probeConnection(navigator.onLine, () => fetch("/", { method: "GET", cache: "no-store", signal: controller.signal }));
    if (controller.signal.aborted) return;
    if (result !== "online") { setNotice(navigator.onLine ? "unreachable" : "offline"); return; }
    router.refresh();
    setNotice(reason === "online" ? "online" : null);
    if (reason === "online") dismissal.current = setTimeout(() => setNotice(null), 4000);
  }, [router]);

  useEffect(() => {
    if (!navigator.onLine) setNotice("offline");
    const onOffline = () => { inFlight.current?.abort(); if (dismissal.current) clearTimeout(dismissal.current); setNotice("offline"); };
    const onOnline = () => { void check("online"); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      inFlight.current?.abort();
      if (dismissal.current) clearTimeout(dismissal.current);
    };
  }, [check]);

  useEffect(() => {
    if (!pullEnabled) return;
    let startX = 0, startY = 0, deltaX = 0, deltaY = 0;
    let tracking = false, pulling = false;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1 || window.scrollY > 1 || !(event.target instanceof Element) || event.target.closest("a,button,input,textarea,select,[contenteditable='true']")) return;
      // Let independently scrollable regions retain their own gestures.
      for (let node = event.target.parentElement; node && node !== document.body; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight) return;
      }
      startX = event.touches[0].clientX; startY = event.touches[0].clientY;
      deltaX = 0; deltaY = 0; tracking = true; pulling = false;
    };
    const move = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1 || window.scrollY > 1) return;
      deltaX = event.touches[0].clientX - startX;
      deltaY = event.touches[0].clientY - startY;
      if (deltaY > 15 && deltaY > Math.abs(deltaX) * 1.5) {
        pulling = true;
        if (event.cancelable) event.preventDefault();
        setPull(true);
      }
    };
    const end = () => {
      if (tracking && pulling && isPullRefreshGesture(deltaX, deltaY)) void check("pull");
      tracking = false; pulling = false; setPull(false);
    };
    const cancel = () => { tracking = false; pulling = false; setPull(false); };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", cancel);
      setPull(false);
    };
  }, [check, pullEnabled]);

  const message = notice === "offline" ? "You’re offline" : notice === "checking" ? "Checking for updates…" : notice === "online" ? "You’re now online" : "Couldn’t check the connection";
  return <>
    {pullEnabled && pull && <div className="pull-notice" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v14m-5-5 5 5 5-5"/></svg><span>Pull down to refresh</span></div>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {notice && <div className="connection-notice" data-state={notice}>
        <span className="connection-notice__icon" aria-hidden="true">
          {notice === "online" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"/></svg> : notice === "checking" ? <svg className="connection-notice__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg> : notice === "offline" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20M8.5 8.5A15 15 0 0 1 22 10M2 10a15 15 0 0 1 3.1-1.9M5 13a10 10 0 0 1 4-2.2M15.5 11.6A10 10 0 0 1 19 13M8.5 16a5 5 0 0 1 7 0M12 20h.01"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 7v6m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg>}
        </span>
        <p>{message}</p>
        {(notice === "offline" || notice === "unreachable") && <button type="button" aria-label="Retry connection" title="Retry connection" onClick={() => void check("retry")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg></button>}
      </div>}
    </div>
  </>;
}
