"use client";

import { useState } from "react";

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function DownloadAppButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn-secondary flex-1 sm:auto"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
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
        aria-labelledby="modal-title"
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-md shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" id="modal-title">
              The Android app is in development
            </h2>
            <button
              type="button"
              className="p-2 text-muted-foreground rounded-md hover:bg-muted transition-colors"
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
              On Android, the website already works in Chrome. Nothing is missing — the native app is for
              notifications and offline reading on a weak connection.
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
