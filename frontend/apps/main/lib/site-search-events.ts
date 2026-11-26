/** Client-safe helpers for opening the header search dialog from anywhere. */
export const OPEN_SEARCH_EVENT = "ep-open-search";
export type OpenSearchDetail = { query?: string };

export function openSiteSearch(query?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail: { query } }));
}

/**
 * True while any modal surface is open, so other prompts can wait their turn.
 * The navigation drawer keeps role="dialog" while closed, so it is checked by
 * its open flag rather than by role.
 */
export function anotherDialogIsOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector([
    "dialog[open]",
    ".drawer-root[data-open=\"true\"]",
    "[role=\"dialog\"][aria-modal=\"true\"]:not([inert])",
    "[data-push-onboarding]",
  ].join(", ")));
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab / Shift+Tab inside an open modal. Native <dialog> makes the page
 * inert but still lets focus leave to the browser chrome after the last
 * control; this wraps it back to the first (and vice versa).
 */
export function trapTabKey(event: { key: string; shiftKey: boolean; preventDefault(): void }, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null || element === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || !container.contains(active))) { event.preventDefault(); first.focus(); }
}
