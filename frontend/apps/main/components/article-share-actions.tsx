"use client";

import { useState } from "react";
import { buildShareCover } from "../lib/share-cover";

type Props = {
  title: string;
  imageUrl?: string | null;
  url: string;
  className?: string;
  shareButtonClassName?: string;
  copyButtonClassName?: string;
  feedbackClassName?: string;
  fallbackClassName?: string;
  compact?: boolean;
  showCopyButton?: boolean;
};

function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export default function ArticleShareActions({ title, imageUrl, url, className = "", shareButtonClassName = "", copyButtonClassName = "", feedbackClassName = "", fallbackClassName = "", compact = false, showCopyButton = true }: Props) {
  const [message, setMessage] = useState("");
  const [showManualCopy, setShowManualCopy] = useState(false);

  async function copyPublicUrl() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(url);
      setShowManualCopy(false);
      setMessage("Public article link copied.");
    } catch {
      setShowManualCopy(true);
      setMessage("Clipboard access is unavailable. Select the public link below to copy it.");
    }
  }

  async function shareArticle() {
    if (navigator.share) {
      let coverAttached = false;
      try {
        if (navigator.canShare?.({ files: [new File(["x"], "cover.png", { type: "image/png" })] })) {
          const cover = await buildShareCover(imageUrl || "/brand-logo.webp");
          if (cover && navigator.canShare({ files: [cover] })) {
            await navigator.share({ title, text: `${title}\n${url}`, files: [cover] });
            setMessage("Cover image and article link sent to the share sheet.");
            coverAttached = true;
          }
        }
        if (coverAttached) return;
        await navigator.share({ title, url });
        setMessage("Link shared. This device or image host did not allow attaching the cover file.");
        return;
      } catch (error) {
        if (isShareCancelled(error)) return;
      }
    }
    await copyPublicUrl();
    setMessage("The cover image could not be attached. Use the copied link or select it below if clipboard access is unavailable.");
  }

  return (
    <div className={className} role="group" aria-label="Share this article">
      <button type="button" className={shareButtonClassName} onClick={shareArticle} aria-label="Share article">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg>
        <span className={compact ? "sr-only" : undefined}>Share</span>
      </button>
      {showCopyButton ? <button type="button" className={copyButtonClassName} onClick={copyPublicUrl} aria-label="Copy public article link">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
        <span className={compact ? "sr-only" : undefined}>Copy link</span>
      </button> : null}
      {message ? <span className={feedbackClassName} role="status" aria-live="polite">{message}</span> : null}
      {showManualCopy ? <label className={fallbackClassName}>Public article URL<input type="text" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /></label> : null}
    </div>
  );
}
