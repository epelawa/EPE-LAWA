"use client";

import { useEffect, useState } from "react";

/**
 * Cookie consent banner.
 *
 * Appears at the bottom of the page until the user accepts or rejects.
 * Stores preference in localStorage so it only shows once.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const accepted = localStorage.getItem("epelawa_cookie_consent");
    if (accepted) setShow(false);
  }, []);

  const accept = () => {
    localStorage.setItem("epelawa_cookie_consent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-slate-600 leading-relaxed">
            We use cookies to improve your experience on EPE LAWA. By continuing,
            you agree to our use of cookies.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-slate-600 underline underline-offset-4 hover:text-blue-600"
              onClick={accept}
            >
              Accept
            </button>
            <a
              href="/privacy"
              className="text-sm text-slate-600 underline underline-offset-4 hover:text-blue-600"
            >
              Privacy notice
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
