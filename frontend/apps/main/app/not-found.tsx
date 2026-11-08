import Link from "next/link";
import FocusedPageControls from "../components/focused-page-controls";
import { EmptyPanel, PageFrame, PageIntro } from "../components/design-system";

export default function NotFound() {
  return (
    <div className="focused-error-shell">
      <PageFrame>
        <FocusedPageControls />
        <PageIntro
          eyebrow="404 · A different direction"
          title="Page not found."
          description="The address may have changed, or the page may not be public."
        />
        <EmptyPanel
          title="Let’s find your way back."
          description="Start from the community home or explore the latest reporting."
          actions={
            <>
              <Link className="btn-primary" href="/">Back to EPE LAWA</Link>
              <Link className="btn-secondary" href="/news">Visit the newsroom</Link>
            </>
          }
        />
      </PageFrame>
    </div>
  );
}
