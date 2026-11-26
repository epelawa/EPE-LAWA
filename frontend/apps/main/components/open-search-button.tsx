"use client";

import { openSiteSearch } from "../lib/site-search-events";

/** A button that opens the header search dialog (the standalone /search page was retired). */
export default function OpenSearchButton({ className = "btn-secondary", children = "Search the site" }: { className?: string; children?: React.ReactNode }) {
  return <button type="button" className={className} aria-haspopup="dialog" onClick={() => openSiteSearch()}>{children}</button>;
}
