"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isPullRefreshGesture, probeConnection } from "../lib/connectivity";

type Notice = "offline" | "checking" | "online" | "unreachable" | null;
type Reason = "online" | "retry" | "pull";

export default function Connectivity() {
  const router = useRouter();
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
    };
  }, [check]);

  const message = notice === "offline" ? "You’re offline" : notice === "checking" ? "Checking for updates…" : notice === "online" ? "You’re now online" : "Couldn’t check the connection";
  return <>
    {pull && <div className="pull-notice" aria-hidden="true">Pull down to refresh</div>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {notice && <div className="connection-notice"><p>{message}</p>{(notice === "offline" || notice === "unreachable") && <button type="button" aria-label="Retry connection" title="Retry connection" onClick={() => void check("retry")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg></button>}</div>}
    </div>
  </>;
}
