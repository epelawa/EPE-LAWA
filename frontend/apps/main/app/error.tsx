"use client";

import Link from "next/link";
import { Container, buttonClassName } from "@epelawa/ui";

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
    <Container>
      <div className="notice-page">
        <p className="page-header__eyebrow">EPE LAWA</p>
        <h1>This page did not load</h1>
        <p>
          Something failed while loading this page. Anything you had typed is still where you left
          it. Try again, or go back to the homepage.
        </p>
        <div className="notice-page__actions">
          <button type="button" className={buttonClassName("primary")} onClick={() => reset()}>
            Try again
          </button>
          <Link className={buttonClassName("secondary")} href="/">
            Return to the homepage
          </Link>
        </div>
      </div>
    </Container>
  );
}
