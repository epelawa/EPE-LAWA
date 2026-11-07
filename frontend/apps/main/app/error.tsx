"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The error object is deliberately not rendered: it can carry internal detail.
  void error;

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 lg:px-8">
      <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        EPE LAWA
      </p>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">
        This page did not load
      </h1>
      <p className="mx-auto mb-8 max-w-sm leading-relaxed text-muted-foreground">
        Something failed while loading this page. Anything you had typed is still
        where you left it. Try again, or go back to the homepage.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {/* reset() re-renders the failed segment. The previous control was an
            <a href="/"> labelled "Try again", which navigated home and retried
            nothing. */}
        <button
          type="button"
          className="btn-primary flex-1 sm:flex-none"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link href="/" className="btn-ghost flex-1 sm:flex-none">
          Return to the homepage
        </Link>
      </div>
    </div>
  );
}
