"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, DownloadIcon } from "@epelawa/ui";

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
        className={`ep-btn ep-btn--secondary play-store-btn ${className}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <DownloadIcon size={18} />
        <span className="ep-btn__label">Download on Google Play</span>
        <span className="play-store-btn__badge">Coming soon</span>
      </button>

      <div className="modal-root" data-open={open ? "true" : "false"}>
        <button
          type="button"
          className="modal-scrim"
          aria-label="Close dialog"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <div
          ref={panelRef}
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-hidden={open ? undefined : "true"}
          inert={!open}
        >
          <div className="modal__head">
            <h2 className="modal__title" id={titleId}>
              The Android app is in development
            </h2>
            <button ref={closeRef} type="button" className="ep-icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="modal__body">
            <p>
              EPE LAWA for Android is being built as a real native application. It will be released on
              Google Play once it is ready. There is no download link yet, and we will not publish one
              before the build actually exists.
            </p>
            <p>
              <strong>On iPhone and iPad today:</strong> open this site in Safari, tap Share, then tap
              <em> Add to Home Screen</em>. It installs as an app and works the same way.
            </p>
            <p className="modal__note">
              On Android, the website already works in Chrome. Nothing is missing — the native app is for
              notifications and offline reading on a weak connection.
            </p>
          </div>

          <div className="modal__actions">
            <button type="button" className="ep-btn ep-btn--primary" onClick={() => setOpen(false)}>
              Continue on the web
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
