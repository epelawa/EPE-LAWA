"use client";

import { useEffect, useId, useRef, useState } from "react";

const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

/**
 * "Download on Google Play" that tells the truth.
 *
 * There is no published Android build yet, so the control must not pretend to link to one.
 * Pressing it opens a dialog that says exactly where the app stands, offers the web version
 * for iOS today, and makes no promise about a date we do not control.
 *
 * The dialog is modal: focus moves to the close control, Tab cycles inside, Escape closes
 * and focus returns to the trigger.
 */
export default function DownloadApp({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`btn-secondary ${className}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <DownloadIcon size={18} />
        <span className="ml-2">Download on Google Play</span>
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
          Coming soon
        </span>
      </button>

      <div
        className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"}`}
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-md shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" id={titleId}>
              The Android app is in development
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="p-2 text-muted-foreground rounded-md hover:bg-muted"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-muted-foreground mb-3">
              EPE LAWA for Android is being built as a real native application. It will be released on
              Google Play once it is ready. There is no download link yet, and we will not publish one
              before the build actually exists.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              <strong>On iPhone and iPad today:</strong> open this site in Safari, tap Share, then tap
              <em> Add to Home Screen</em>.
            </p>
            <p className="text-xs text-muted-foreground">
              The website already works in Chrome. Offline article reading and web push notifications are
              not active yet; both are marked Coming Soon in the News section.
            </p>
          </div>

          <div className="flex">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => setOpen(false)}
            >
              Continue on the web
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
