"use client";

import Link from "next/link";
import { EmptyPanel, PageFrame, PageIntro } from "../components/design-system";
import FocusedPageControls from "../components/focused-page-controls";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="focused-error-shell">
      <PageFrame>
        <FocusedPageControls />
        <PageIntro
          eyebrow="A brief interruption"
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
