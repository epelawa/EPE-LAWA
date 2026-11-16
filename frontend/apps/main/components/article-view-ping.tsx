"use client";

import { useEffect } from "react";

const VIEWER_KEY = "epe-lawa:viewer-key";

function viewerKey(): string {
  try {
    const existing = window.localStorage.getItem(VIEWER_KEY);
    if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
    const key = crypto.randomUUID().replaceAll("-", "");
    window.localStorage.setItem(VIEWER_KEY, key);
    return key;
  } catch {
    // Storage may be unavailable; fall back to a per-page random key so the
    // request still carries a well-formed value.
    return crypto.randomUUID().replaceAll("-", "");
  }
}

/**
 * Records one view per browser per UTC day through the `record_article_view`
 * RPC. This is a real signal, not a fabricated number: when the database is
 * unreachable the counter simply does not move.
 */
export default function ArticleViewPing({ articleId }: { articleId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/news/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, viewerKey: viewerKey() }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {
        // A failed counter write must never interrupt reading.
      });
    }, 1200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [articleId]);
  return null;
}
