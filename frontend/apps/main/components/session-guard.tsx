"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrandedDialog from "./branded-dialog";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_MAX_AGE_SECONDS, type SessionScope } from "../lib/session-policy";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
const WRITE_INTERVAL_MS = 20_000;
const CHECK_INTERVAL_MS = 20_000;

function storageKey(scope: SessionScope) {
  return `epe-lawa:${scope}:last-activity`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function writeActivity(scope: SessionScope, timestamp: number) {
  try {
    window.localStorage.setItem(storageKey(scope), String(timestamp));
  } catch {
    // Storage can be unavailable in private modes; the cookie is our fallback.
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACTIVITY_COOKIE[scope]}=${timestamp}; Path=/; Max-Age=${ACTIVITY_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    // A blocked cookie must not break the guard loop; localStorage still works.
  }
}

function latestActivity(scope: SessionScope): number | null {
  const values: number[] = [];
  try {
    const stored = Number(window.localStorage.getItem(storageKey(scope)));
    if (Number.isFinite(stored) && stored > 0) values.push(stored);
  } catch {
    // Ignore storage failures.
  }
  const cookie = Number(readCookie(ACTIVITY_COOKIE[scope]));
  if (Number.isFinite(cookie) && cookie > 0) values.push(cookie);
  return values.length ? Math.max(...values) : null;
}

/**
 * Ends idle sessions instead of leaving them open forever.
 *
 * Member scope: one week without pointer/keyboard/touch activity.
 * Staff scope: ten hours, mounted inside the protected staff layout.
 *
 * The timestamp is mirrored into a first-party cookie so the server can refuse
 * a stale page even when JavaScript was suspended mid-session.
 */
export default function SessionGuard({
  scope,
  timeoutMs,
  warningMs = 5 * 60 * 1000,
  signOutAction,
}: {
  scope: SessionScope;
  timeoutMs: number;
  warningMs?: number;
  signOutAction: () => Promise<void>;
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const lastActivity = useRef<number>(Date.now());
  const lastWrite = useRef<number>(0);
  const signingOut = useRef(false);

  const endSession = useCallback(() => {
    if (signingOut.current) return;
    signingOut.current = true;
    setWarningOpen(false);
    setEnded(true);
    void Promise.resolve(signOutAction()).catch(() => {
      signingOut.current = false;
    });
  }, [signOutAction]);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    lastActivity.current = now;
    if (!force && now - lastWrite.current < WRITE_INTERVAL_MS) return;
    lastWrite.current = now;
    writeActivity(scope, now);
    setWarningOpen(false);
  }, [scope]);

  useEffect(() => {
    const stored = latestActivity(scope);
    if (stored && Date.now() - stored > timeoutMs) {
      endSession();
      return;
    }
    if (stored) lastActivity.current = stored;
    markActive(true);
    const onActivity = () => markActive();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      const remaining = timeoutMs - (Date.now() - lastActivity.current);
      if (remaining <= 0) endSession();
      else if (remaining <= warningMs) setWarningOpen(true);
    }, CHECK_INTERVAL_MS);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      window.clearInterval(timer);
    };
  }, [scope, timeoutMs, warningMs, markActive, endSession]);

  return (
    <>
      <BrandedDialog
        open={warningOpen && !ended}
        onClose={() => markActive(true)}
        title="Still there?"
        description={scope === "staff"
          ? "For security, staff sessions end after ten hours without activity. You will be signed out in a few minutes unless you stay."
          : "Member sessions end after one week without activity. You will be signed out in a few minutes unless you stay."}
      >
        <div className="ui-dialog__actions">
          <button className="btn-secondary" type="button" onClick={() => void signOutAction()}>Sign out now</button>
          <button className="btn-primary" type="button" data-autofocus onClick={() => markActive(true)}>Stay signed in</button>
        </div>
      </BrandedDialog>
      {ended ? (
        <p className="sr-only" role="status">Your inactivity window ended. Signing you out.</p>
      ) : null}
    </>
  );
}
