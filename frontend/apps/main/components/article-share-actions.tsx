"use client";

import { useEffect, useRef, useState } from "react";
import { buildShareCover } from "../lib/share-cover";

type Props = {
  title: string;
  imageUrl?: string | null;
  url: string;
  /** Same-origin copy of the cover (/news/<slug>/cover), so outlet photos can be attached. */
  coverPath?: string | null;
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

/** WhatsApp and some galleries treat WebP/GIF files as stickers or reject them: send a JPEG. */
async function asJpeg(file: File): Promise<File> {
  if (file.type === "image/jpeg" || file.type === "image/png") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob ? new File([blob], "epe-lawa-cover.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** The story's cover as a file: our own copy first, then the original, then the EPE LAWA logo. */
async function loadCoverFile(sources: (string | null | undefined)[]): Promise<File | null> {
  for (const source of sources) {
    if (!source) continue;
    const file = await buildShareCover(source);
    if (file) return asJpeg(file);
  }
  return null;
}

export default function ArticleShareActions({ title, imageUrl, url, coverPath, className = "", shareButtonClassName = "", copyButtonClassName = "", feedbackClassName = "", fallbackClassName = "", compact = false, showCopyButton = true }: Props) {
  const [message, setMessage] = useState("");
  const [showManualCopy, setShowManualCopy] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<Promise<File | null> | null>(null);
  const sources = [coverPath, imageUrl, "/brand-logo.png"];

  function prepareCover(): Promise<File | null> {
    coverRef.current ??= loadCoverFile(sources).then((file) => {
      if (!file) coverRef.current = null; // try again on the next tap
      return file;
    });
    return coverRef.current;
  }

  // Fetch the cover as soon as the Share button is on screen, so a tap opens the
  // share sheet immediately with the picture attached (browsers refuse to open it
  // if the tap was too long ago).
  useEffect(() => {
    const node = groupRef.current;
    if (!node || typeof navigator === "undefined" || !navigator.share) return;
    if (typeof IntersectionObserver === "undefined") {
      void prepareCover();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void prepareCover();
        observer.disconnect();
      }
    }, { rootMargin: "400px" });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverPath, imageUrl]);

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
      try {
        const cover = await prepareCover();
        if (cover && navigator.canShare?.({ files: [cover] })) {
          await navigator.share({ title, text: `${title}\n${url}`, files: [cover] });
          setMessage("Cover image and article link sent to the share sheet.");
          return;
        }
        await navigator.share({ title, url });
        setMessage("Link shared. This device does not allow attaching image files.");
        return;
      } catch (error) {
        if (isShareCancelled(error)) return;
        // The browser refused because the tap was too long ago; the cover is ready now.
        if (error instanceof Error && error.name === "NotAllowedError") {
          setMessage("The cover image is ready — tap Share again to send it.");
          return;
        }
      }
    }
    await copyPublicUrl();
    setMessage("This browser cannot share files. The article link was copied instead.");
  }

  return (
    <div ref={groupRef} className={className} role="group" aria-label="Share this article">
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
