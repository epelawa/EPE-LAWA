"use client";

import { useEffect } from "react";
import { openSiteSearch } from "../lib/site-search-events";

/**
 * Press "/" anywhere to search. A page with its own search field (marked
 * data-slash-focus, e.g. /news) keeps it; elsewhere the header search dialog
 * opens. Skips form elements and dialog content so typing is never hijacked.
 */
export default function SlashFocus() {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable=true], dialog") ?? target.isContentEditable)) return;
      const field = document.querySelector<HTMLElement>("[data-slash-focus]");
      event.preventDefault();
      if (field && field.offsetParent !== null) field.focus();
      else openSiteSearch();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  return null;
}
