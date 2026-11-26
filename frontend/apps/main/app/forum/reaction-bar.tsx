"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./reaction.module.css";

const MESSAGES: Record<string, string> = {
  signin: "Your session ended. Sign in again to support posts.",
  profile: "An active member profile is needed to support posts.",
  invalid: "This post can no longer be supported.",
};

function Heart({ filled }: { filled: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.3 5c2 0 3.2 1.1 3.9 2.2h3.6C14.5 6.1 15.7 5 17.7 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20Z" /></svg>;
}

/**
 * Support (reaction) toggle. The count is optimistic while the request is in
 * flight, then replaced by the server's count; whether this member now supports
 * the post is inferred from that confirmed count (the toggle RPC returns only
 * the total), so the pressed state never contradicts the database. Failures
 * restore the previous state and say why.
 */
export default function ReactionBar({ postId, initialCount, signedIn }: { postId: string; initialCount: number; signedIn: boolean }) {
  const pathname = usePathname() ?? "/forum";
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    if (busy || !signedIn) return;
    const previous = { count, reacted };
    setBusy(true);
    setError("");
    setReacted(!reacted);
    setCount(reacted ? Math.max(0, count - 1) : count + 1);
    setPop(true);
    window.setTimeout(() => setPop(false), 450);
    try {
      const response = await fetch("/api/forum/react", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId }),
        cache: "no-store",
      });
      const data: { state?: string; count?: number | null } = await response.json();
      if (data?.state === "ok" && typeof data.count === "number") {
        setCount(data.count);
        setReacted(data.count > previous.count ? true : data.count < previous.count ? false : !previous.reacted);
      } else {
        setReacted(previous.reacted);
        setCount(previous.count);
        setError(MESSAGES[data?.state ?? ""] ?? "Your support could not be saved. Please try again.");
      }
    } catch {
      setReacted(previous.reacted);
      setCount(previous.count);
      setError("Your support could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) {
    return <Link className={styles.bar} href={`/login?next=${encodeURIComponent(pathname)}`}>
      <span className={styles.heart}><Heart filled={false} /></span> Support
    </Link>;
  }
  return <span className={styles.wrap}>
    <button type="button" className={reacted ? `${styles.bar} ${styles.barOn}` : styles.bar} aria-pressed={reacted} aria-busy={busy} disabled={busy} onClick={toggle}>
      <span className={pop ? `${styles.heart} ${styles.heartPop}` : styles.heart}><Heart filled={reacted} /></span>
      {count > 0 ? <><span className={pop ? `${styles.count} ${styles.countPop}` : styles.count}>{count}</span> {count === 1 ? "support" : "supports"}</> : "Support"}
    </button>
    {error ? <span className={styles.error} role="alert">{error}</span> : null}
  </span>;
}
