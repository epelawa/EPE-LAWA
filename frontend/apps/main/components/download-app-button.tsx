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
        <span className="ml-2">Android app status</span>
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
          Not on Play Store
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
              No Android app is available
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
              EPE LAWA currently has no downloadable Android app or Google Play listing. The native
              mobile app is deferred; this website is the available web experience.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              <strong>On iPhone and iPad today:</strong> open this site in Safari, tap Share, then tap
              <em> Add to Home Screen</em>.
            </p>
            <p className="text-xs text-muted-foreground">
              Published news stories can be downloaded as text-only offline copies from their article
              pages. Push notifications and live radio are unavailable until verified providers are
              configured.
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
