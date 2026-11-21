"use client";

import { useEffect } from "react";

/**
 * Press "/" anywhere to jump to the page search field.
 * Skips form elements and dialog content so typing is never hijacked.
 */
export default function SlashFocus() {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable=true], dialog") ?? target.isContentEditable)) return;
      const field = document.querySelector<HTMLElement>("[data-slash-focus]");
      const visible = field && field.offsetParent !== null;
      if (!visible) return;
      event.preventDefault();
      field.focus();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  return null;
}
