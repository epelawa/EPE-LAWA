"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TurnstileField from "./turnstile-field";
import styles from "./human-check.module.css";

/**
 * Turnstile-style human check for public forms (server side: lib/human-check.ts).
 * Uses Cloudflare Turnstile when the deployment has its keys; otherwise runs
 * EPE LAWA's own invisible proof-of-work check in the browser. Nothing is
 * tracked and no third-party script is loaded for the built-in check.
 */

type Mode = "loading" | "turnstile" | "own" | "off";
type Status = "working" | "done" | "error";

const REFRESH_MS = 90 * 60 * 1000;

function zeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) { bits += 8; continue; }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

async function solve(token: string, difficulty: number, cancelled: () => boolean): Promise<string | null> {
  const encoder = new TextEncoder();
  for (let counter = 0; counter < 50_000_000; counter += 1) {
    if (counter % 400 === 0) {
      if (cancelled()) return null;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${token}:${counter}`)));
    if (zeroBits(digest) >= difficulty) return String(counter);
  }
  return null;
}

export default function HumanCheck({ compact }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [status, setStatus] = useState<Status>("working");
  const [token, setToken] = useState("");
  const [solution, setSolution] = useState("");
  const run = useRef(0);

  const start = useCallback(async () => {
    const id = ++run.current;
    const cancelled = () => id !== run.current;
    setStatus("working"); setSolution("");
    try {
      const response = await fetch("/api/human-check", { cache: "no-store" });
      const data: { mode?: string; token?: string; difficulty?: number } = await response.json();
      if (cancelled()) return;
      if (data.mode === "turnstile") { setMode("turnstile"); return; }
      if (data.mode !== "own" || typeof data.token !== "string" || typeof data.difficulty !== "number") { setMode("off"); return; }
      setMode("own");
      setToken(data.token);
      if (!window.isSecureContext || !crypto?.subtle) { setStatus("error"); return; }
      const found = await solve(data.token, data.difficulty, cancelled);
      if (cancelled()) return;
      if (found === null) { setStatus("error"); return; }
      setSolution(found);
      setStatus("done");
    } catch {
      if (!cancelled()) { setMode((current) => (current === "loading" ? "own" : current)); setStatus("error"); }
    }
  }, []);

  useEffect(() => {
    void start();
    const timer = window.setInterval(() => void start(), REFRESH_MS);
    return () => { run.current += 1; window.clearInterval(timer); };
  }, [start]);

  if (mode === "turnstile") return <TurnstileField compact={compact} />;
  if (mode === "off" || mode === "loading") return null;

  return <div className={styles.box} data-status={status} aria-live="polite">
    <input type="hidden" name="hc-token" value={token} />
    <input type="hidden" name="hc-solution" value={solution} />
    <span className={styles.mark} aria-hidden="true">
      {status === "done"
        ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        : status === "error"
          ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>
          : <span className={styles.spinner} />}
    </span>
    <span className={styles.copy}>
      <span className={styles.title}>{status === "done" ? "Verified" : status === "error" ? "Check did not finish" : "Checking you are human…"}</span>
      <span className={styles.hint}>{status === "error" ? "This browser could not complete the check." : "Spam protection by EPE LAWA · no tracking"}</span>
    </span>
    {status === "error" ? <button type="button" className="btn-secondary" onClick={() => void start()}>Try again</button> : null}
  </div>;
}
