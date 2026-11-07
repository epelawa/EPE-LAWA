"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Storage notice.
 *
 * The previous copy said "we use cookies" while /privacy says no cookies are set.
 * Both cannot be true. This site sets no cookies — it stores three preferences in
 * localStorage — so the notice says that instead.
 *
 * Not a modal: it must not trap focus or block the page, and "Got it" is enough
 * because nothing is being consented to that could be refused.
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
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card shadow-lg"
      role="region"
      aria-label="Storage notice"
    >
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            This site does not set cookies. It stores your theme choice and this
            answer in your browser, and nothing is shared with anyone.
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary" onClick={accept}>
              Got it
            </button>
            <Link href="/privacy" className="btn-ghost">
              Privacy notice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
