"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./reaction.module.css";

export default function ReactionBar({ postId, initialCount, signedIn }: { postId: string; initialCount: number; signedIn: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);

  const toggle = async () => {
    if (busy) return;
    if (!signedIn) return;
    setBusy(true);
    const optimistic = reacted ? Math.max(0, count - 1) : count + 1;
    setReacted(!reacted);
    setCount(optimistic);
    setPop(true);
    setTimeout(() => setPop(false), 450);
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
      } else {
        setReacted(reacted);
        setCount(count);
      }
    } catch {
      setReacted(reacted);
      setCount(count);
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) {
    return <Link className={styles.bar} href="/login?next=%2Fforum">
      <span className={styles.heart} aria-hidden="true">&#9825;</span> Support
    </Link>;
  }
  return <button type="button" className={reacted ? `${styles.bar} ${styles.barOn}` : styles.bar} aria-pressed={reacted} disabled={busy} onClick={toggle}>
    <span className={pop ? `${styles.heart} ${styles.heartPop}` : styles.heart} aria-hidden="true">&#9829;</span>
    {count > 0 ? <><span className={pop ? `${styles.count} ${styles.countPop}` : styles.count}>{count}</span> {count === 1 ? "support" : "supports"}</> : "Support"}
  </button>;
}
