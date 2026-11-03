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
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
        EPE LAWA
      </p>
      <h1 className="text-2xl font-bold tracking-tight mb-4">This page did not load</h1>
      <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
        Something failed while loading this page. Anything you had typed is still where you left
        it. Try again, or go back to the homepage.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/"
          className="btn-primary flex-1 sm:auto"
        >
          Try again
        </a>
        <Link href="/" className="btn-ghost flex-1 sm:auto">
          Return to the homepage
        </Link>
      </div>
    </div>
  );
}
