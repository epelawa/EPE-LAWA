"use client";

import { useEffect } from "react";

/**
 * Stamps the signed-in member's read position for this thread once the page has
 * actually been read for a moment. Failed marks are silent: the unread dot may
 * reappear later, which is always the honest outcome.
 */
export default function ForumReadPing({ threadId }: { threadId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/forum/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {});
    }, 2000);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [threadId]);
  return null;
}
