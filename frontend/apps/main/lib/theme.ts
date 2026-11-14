/**
 * Theme handling, in one place.
 *
 * The choice is stored under one key and applied as `data-theme` on <html>. `system` is the
 * default so a reader who has already set their phone to dark does not get a white flash.
 *
 * `themeScript` is injected inline in <head>, before the first paint. It is deliberately
 * tiny and cannot import anything: its whole job is to set the attribute early enough that
 * there is no flash of the wrong theme. Everything else lives in the React component.
 */

export const THEME_STORAGE_KEY = "epelawa-theme";

export type ThemeChoice = "light" | "dark" | "system";

/** Runs before paint. Keep it dependency-free and defensive — localStorage can throw. */
export const themeScript = `(function(){document.documentElement.classList.add("js-enabled");try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="light"||s==="dark"?s:(d?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#17264A":"#F1F4FA");}catch(e){}})();`;

export function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** The theme actually in effect right now, resolving `system` against the device setting. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "light";
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(choice: ThemeChoice): "light" | "dark" {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#17264A" : "#F1F4FA");
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode or a locked-down browser. The theme still applies for this session.
  }
  return resolved;
}
