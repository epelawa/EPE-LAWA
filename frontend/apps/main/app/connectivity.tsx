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

  const message = notice === "offline" ? "You're offline" : notice === "checking" ? "Checking for updates…" : notice === "online" ? "You're now online" : "Couldn't check the connection";
  return <>
    {pullEnabled && pull && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-green-700)] text-white text-sm shadow-lg" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 4v14m-5-5 5 5 5-5"/></svg>
        <span>Pull down to refresh</span>
      </div>
    )}
    <div role="status" aria-live="polite" aria-atomic="true">
      {notice && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-full shadow-lg border ${
          notice === "online" ? "bg-[var(--color-green-700)] text-white border-[var(--color-green-700)]" :
          notice === "checking" ? "bg-primary text-white border-primary" :
          "bg-foreground text-background border-border"
        }`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20">
            {notice === "online" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m5 12 4 4L19 6"/></svg>
            ) : notice === "checking" ? (
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M12 7v6m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg>
            )}
          </span>
          <p className="text-sm font-medium">{message}</p>
          {(notice === "offline" || notice === "unreachable") && (
            <button type="button" className="ml-auto text-xs font-medium bg-white/10 hover:bg-white/20 rounded px-3 py-1" aria-label="Retry connection" onClick={() => void check("retry")}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  </>;
}
