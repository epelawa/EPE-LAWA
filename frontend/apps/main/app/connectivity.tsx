"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isPullRefreshEnabled,
  isPullRefreshGesture,
  nextProbeDelay,
  probeConnection,
  PROBE_TIMEOUT_MS,
  RESTORED_DISMISS_MS,
  SLOW_THRESHOLD_MS,
} from "../lib/connectivity";

/**
 * Connection and system notices.
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

type Reason = "initial" | "online" | "manual" | "pull" | "retry" | "visible";

const COPY: Record<Notice, string> = {
  slow: "Slow connection. Content may take a moment.",
  offline: "You're offline. Showing what's already loaded.",
  restored: "Back online.",
  unavailable: "EPE LAWA is not responding. Retrying\u2026",
  retrying: "Reconnecting\u2026",
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
  const pathname = usePathname();
  const pullEnabled = isPullRefreshEnabled(pathname);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [pull, setPull] = useState(false);

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

      if (reason === "manual" || reason === "pull") show("retrying");

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

        // Pull-to-refresh always re-renders. A recovery refetches so the page
        // is not left showing a stale offline rendering.
        if (recovered || reason === "pull") router.refresh();
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

  useEffect(() => {
    if (!pullEnabled) return;

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;
    let tracking = false;
    let pulling = false;

    const start = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        window.scrollY > 1 ||
        !(event.target instanceof Element) ||
        event.target.closest("a,button,input,textarea,select,[contenteditable='true']")
      ) {
        return;
      }
      // Do not hijack a scroll container.
      for (let node = event.target.parentElement; node && node !== document.body; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight) return;
      }
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      deltaX = 0;
      deltaY = 0;
      tracking = true;
      pulling = false;
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
      const shouldRefresh = tracking && pulling && isPullRefreshGesture(deltaX, deltaY);
      tracking = false;
      pulling = false;
      setPull(false);
      if (shouldRefresh) void runProbeRef.current("pull");
    };

    const cancel = () => {
      tracking = false;
      pulling = false;
      setPull(false);
    };

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
  }, [pullEnabled]);

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
      {pullEnabled && pull ? (
        <div className="pull-cue" aria-hidden="true">
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
            <path d="M12 5v14" />
            <path d="m5 12 7 7 7-7" />
          </svg>
          Release to refresh
        </div>
      ) : null}

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
      <p className="toast__text">{COPY[notice]}</p>

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
