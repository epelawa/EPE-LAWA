"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nextProbeDelay, probeConnection, PROBE_TIMEOUT_MS, RESTORED_DISMISS_MS, SLOW_THRESHOLD_MS } from "../lib/connectivity";
import "./notice-refinement.css";

/**
 * Connection notices.
 *
 * One toast, one message at a time. It is a status report, not a conversation:
 * nothing here claims a connection state that was not measured, and a probe
 * that ends without an answer shows nothing rather than guessing.
 *
 * Behaviour in one paragraph: the browser going offline shows "offline" at
 * once (that is a real signal). Coming back online is not trusted on its own —
 * the app probes, and only a successful probe produces "Back online." A probe
 * that crosses 2.5 s produces "slow" while it is still running. A 5xx produces
 * "unavailable" and schedules an exponential-backoff retry; while offline we do
 * not poll at all and wait for the browser's online event. A manual retry shows
 * "Reconnecting…". Dismissing a notice suppresses that same notice until the
 * state actually changes.
 */

type Notice = "slow" | "offline" | "restored" | "unavailable" | "retrying";

type Reason = "initial" | "online" | "manual" | "retry" | "visible";

const COPY: Record<Notice, { title: string; detail: string }> = {
  slow: { title: "Slow connection", detail: "New content may take a moment." },
  offline: { title: "You’re offline", detail: "What’s already loaded stays visible." },
  restored: { title: "Back online", detail: "The connection is working again." },
  unavailable: { title: "Service unavailable", detail: "We’ll retry in a moment." },
  retrying: { title: "Reconnecting…", detail: "Checking the connection." },
};

/** Offline and unavailable are worth interrupting for. The rest are not. */
const ASSERTIVE: ReadonlySet<Notice> = new Set<Notice>(["offline", "unavailable"]);

/** Only these two have something useful to do about them. */
const RETRYABLE: ReadonlySet<Notice> = new Set<Notice>(["offline", "unavailable"]);

/** A probe target that is cheap, same-origin, and cache-busting by design. */
const PROBE_PATH = "/status/200";

/** Do not probe again this soon after the last one, whatever wakes us up. */
const MIN_PROBE_INTERVAL_MS = 30000;
export default function Connectivity() {
  const router = useRouter();

  const [notice, setNotice] = useState<Notice | null>(null);

  const requestId = useRef(0);
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef<Notice | null>(null);
  const wasDegraded = useRef(false);
  const lastProbeAt = useRef(0);
  const mounted = useRef(true);

  /** Set below, once the probe callback exists. Lets timers call the latest one. */
  const runProbeRef = useRef<(reason: Reason) => Promise<void>>(async () => {});

  const clearRetry = useCallback(() => {
    if (retryTimer.current !== null) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const clearDismiss = useCallback(() => {
    if (dismissTimer.current !== null) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const show = useCallback((next: Notice | null) => {
    if (next === null) {
      setNotice(null);
      return;
    }
    // A dismissed notice stays dismissed until the state changes to a
    // different one. Re-showing it every probe would be nagging.
    if (dismissed.current === next) return;
    if (dismissed.current !== null) dismissed.current = null;
    setNotice(next);
  }, []);

  const scheduleRetry = useCallback(() => {
    const delay = nextProbeDelay(attempts.current);
    attempts.current += 1;
    clearRetry();
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      if (mounted.current) void runProbeRef.current("retry");
    }, delay);
  }, [clearRetry]);

  const runProbe = useCallback(
    async (reason: Reason) => {
      clearRetry();
      clearDismiss();

      const id = ++requestId.current;
      const browserOnline = navigator.onLine;
      lastProbeAt.current = Date.now();

      if (!browserOnline) {
        wasDegraded.current = true;
        attempts.current = 0;
        show("offline");
        return;
      }

      if (reason === "manual") show("retrying");

      const result = await probeConnection(
        browserOnline,
        (signal) =>
          fetch(PROBE_PATH, {
            method: "GET",
            cache: "no-store",
            signal,
            headers: { accept: "text/html" },
          }).then((response) => ({ ok: response.ok, status: response.status })),
        {
          slowMs: SLOW_THRESHOLD_MS,
          timeoutMs: PROBE_TIMEOUT_MS,
          onSlow: () => {
            if (mounted.current && id === requestId.current) show("slow");
          },
        },
      );

      // A newer probe started, or the component is gone. Drop this result.
      if (!mounted.current || id !== requestId.current) return;

      if (result === "online") {
        const recovered = wasDegraded.current;
        attempts.current = 0;
        wasDegraded.current = false;

        if (recovered) {
          dismissed.current = null;
          show("restored");
          dismissTimer.current = setTimeout(() => {
            dismissTimer.current = null;
            if (mounted.current) setNotice(null);
          }, RESTORED_DISMISS_MS);
        } else {
          show(null);
        }

        // A recovered connection refetches so the page is not left showing a
        // stale offline rendering.
        if (recovered) router.refresh();
        return;
      }

      if (result === "offline") {
        wasDegraded.current = true;
        attempts.current = 0;
        show("offline");
        // No polling while offline. The browser's online event is the only
        // thing that can prove the network is back.
        return;
      }

      if (result === "unavailable") {
        wasDegraded.current = true;
        show("unavailable");
        scheduleRetry();
        return;
      }

      // Inconclusive: we waited and got no answer. Clear a transient in-flight
      // notice, but keep a state we actually measured earlier.
      if (!wasDegraded.current) {
        show(null);
        return;
      }
      scheduleRetry();
    },
    [clearDismiss, clearRetry, router, scheduleRetry, show],
  );

  // The retry timer needs a stable reference to the latest probe.
  useEffect(() => {
    runProbeRef.current = runProbe;
  }, [runProbe]);

  useEffect(() => {
    mounted.current = true;

    const onOffline = () => {
      // Any in-flight probe is now irrelevant.
      requestId.current += 1;
      clearRetry();
      clearDismiss();
      wasDegraded.current = true;
      attempts.current = 0;
      show("offline");
    };

    const onOnline = () => {
      // The flag alone is not proof; probe before saying anything.
      void runProbeRef.current("online");
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if (!navigator.onLine) {
      wasDegraded.current = true;
      show("offline");
    } else {
      void runProbeRef.current("initial");
    }

    return () => {
      mounted.current = false;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      requestId.current += 1;
      clearRetry();
      clearDismiss();
    };
  }, [clearDismiss, clearRetry, show]);

  // Returning to the tab is a cheap moment to re-check: the network may have
  // changed while the page sat in the background. Guarded so it cannot loop.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) return;
      if (Date.now() - lastProbeAt.current < MIN_PROBE_INTERVAL_MS) return;
      void runProbeRef.current("visible");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const dismiss = useCallback(() => {
    if (notice !== null) dismissed.current = notice;
    clearDismiss();
    setNotice(null);
  }, [clearDismiss, notice]);

  const retry = useCallback(() => {
    void runProbeRef.current("manual");
  }, []);

  const polite = notice !== null && !ASSERTIVE.has(notice) ? notice : null;
  const assertive = notice !== null && ASSERTIVE.has(notice) ? notice : null;

  return (
    <>
      {/* Two live regions, one message. aria-live cannot be changed reliably
          after mount, so the polite and assertive cases get their own region
          and only one of them ever holds content. */}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {polite ? (
          <Toast key={polite} notice={polite} onRetry={retry} onDismiss={dismiss} />
        ) : null}
      </div>

      <div className="toast-region" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive ? (
          <Toast key={assertive} notice={assertive} onRetry={retry} onDismiss={dismiss} />
        ) : null}
      </div>
    </>
  );
}

function Toast({
  notice,
  onRetry,
  onDismiss,
}: {
  notice: Notice;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="toast">
      <svg className="toast__symbol" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.9 9a11 11 0 0 1 14.2 0M8 12.1a6.6 6.6 0 0 1 8 0M10.7 15.2a2.5 2.5 0 0 1 2.6 0"/><circle cx="12" cy="18" r=".7"/>{notice === "offline" || notice === "unavailable" ? <path d="m3 3 18 18"/> : null}</svg>
      <div className="toast__copy"><strong className="toast__title">{COPY[notice].title}</strong><p className="toast__text">{COPY[notice].detail}</p></div>

      {RETRYABLE.has(notice) ? (
        <button className="toast__action" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}

      <button
        className="toast__close"
        type="button"
        aria-label="Dismiss connection notice"
        onClick={onDismiss}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
