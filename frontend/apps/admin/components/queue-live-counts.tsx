"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { staffHref } from "../lib/admin-path";

type Counts = { submissions: number | null; corrections: number | null; enquiries: number | null };

const labels: { key: keyof Counts; label: string; href: string }[] = [
  { key: "submissions", label: "Directory submissions", href: "/business-review" },
  { key: "corrections", label: "Corrections", href: "/people" },
  { key: "enquiries", label: "Enquiries", href: "/enquiries" },
];

export default function QueueLiveCounts() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const previous = useRef<Counts | null>(null);
  const [flick, setFlick] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch("/api/live/queues", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data: { queues?: Counts } = await response.json();
        if (!alive || !data?.queues) return;
        const next = data.queues;
        const before = previous.current;
        previous.current = next;
        setCounts(next);
        if (before) {
          const changed = labels.find(({ key }) => typeof next[key] === "number" && (before[key] === null || (before[key] as number) !== (next[key] as number)));
          if (changed) {
            setFlick(changed.key);
            setTimeout(() => setFlick(null), 1600);
          }
        }
      } catch { /* keep the last known counts */ }
      if (alive) timer = setTimeout(poll, 45000);
    };
    timer = setTimeout(poll, 45000);
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  if (!counts) return null;
  const visible = labels.filter(({ key }) => typeof counts[key] === "number" && (counts[key] as number) > 0);
  if (visible.length === 0) return null;
  return <div className="queue-strip" role="status" aria-live="polite" aria-label="Live queue counts">
    <p className="queue-strip__label">Waiting on you</p>
    <ul>
      {visible.map(({ key, label, href }) => (
        <li key={key} className={flick === key ? "queue-chip queue-chip--hot" : "queue-chip"}>
          <Link href={staffHref(href)}>
            <span>{label}</span>
            <span className="queue-chip__count">{counts[key]}</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>;
}
