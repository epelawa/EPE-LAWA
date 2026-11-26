import Link from "next/link";
import OpenSearchButton from "../components/open-search-button";
import FocusedPageControls from "../components/focused-page-controls";
import { EmptyPanel, PageFrame, PageIntro } from "../components/design-system";

export default function NotFound() {
  return (
    <div className="focused-error-shell">
      <PageFrame>
        <FocusedPageControls />
        <div aria-hidden="true" className="not-found-mark">
          <svg viewBox="0 0 160 120" width="160" height="120" fill="none">
            <path d="M31 91 45 30a8 8 0 0 1 8-6h54a8 8 0 0 1 8 6l14 61a8 8 0 0 1-8 10H39a8 8 0 0 1-8-10Z" stroke="currentColor" strokeWidth="3" />
            <path d="M51 49h58M51 63h39M51 77h25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="119" cy="81" r="21" fill="currentColor" opacity=".12" />
            <path d="m134 96 13 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <PageIntro
          eyebrow="404 · A different direction"
          title="Page not found."
          description="The address may have changed, or the page may not be public."
        />
        <EmptyPanel
          title="Let’s find your way back."
          description="Start from the community home, search the whole site, or pick a section below."
          actions={
            <>
              <Link className="btn-primary" href="/">Back to EPE LAWA</Link>
              <OpenSearchButton />
            </>
          }
        />
        <nav aria-label="Popular sections">
          <ul className="ui-actions" style={{ flexWrap: "wrap" }}>
            {[
              ["/news", "Newsroom"],
              ["/itan-ilu-mi", "Ìtàn Ilú Mi — Community History"],
              ["/forum", "Forum"],
              ["/business-directory", "Business Directory"],
              ["/tourism", "Tourism & Historical Sites"],
              ["/radio", "EPE LAWA Radio"],
              ["/who-is-who", "Who is Who"],
              ["/map", "Map & Navigation"],
            ].map(([href, label]) => <li key={href}><Link className="btn-secondary" href={href}>{label}</Link></li>)}
          </ul>
        </nav>
      </PageFrame>
    </div>
  );
}
