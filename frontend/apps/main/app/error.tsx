"use client";

import Link from "next/link";
import { EmptyPanel, PageFrame, PageIntro } from "../components/design-system";
import FocusedPageControls from "../components/focused-page-controls";
import styles from "./page-error.module.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="focused-error-shell">
      <PageFrame>
        <FocusedPageControls />
        <div className={styles.art} aria-hidden="true">
          <span className={styles.orbit} />
          <svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="29" fill="#e7f0ff" stroke="#477fe0" strokeWidth="2"/><path d="M37 58c7-10 19-10 26 0M38 43h.1M62 43h.1" stroke="#294b91" strokeWidth="4" strokeLinecap="round"/><path d="M18 24l3 3m56 46 4 4M77 19l4-4M15 66h6" stroke="#477fe0" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
        <PageIntro
          title="This page couldn’t be loaded."
          description="Something interrupted the request. Your next step is still simple."
        />
        <EmptyPanel
          title="Try once more, or take another route."
          description="No private error details are shown here. If the problem continues, see whether contact intake is currently available."
          actions={
            <>
              <button type="button" className="btn-primary" onClick={() => reset()}>
                Try again
              </button>
              <Link className="btn-secondary" href="/">
                Go to the homepage
              </Link>
              <Link className="ui-text-link" href="/contact">
                View contact availability
              </Link>
            </>
          }
        />
      </PageFrame>
    </div>
  );
}
