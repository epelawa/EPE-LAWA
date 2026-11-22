/**
 * Theme handling for EPE LAWA
 * Supports light, dark, and system preferences
 * The pre-paint script prevents flash of wrong theme
 */
export const THEME_STORAGE_KEY = "epelawa-theme";
export type ThemeChoice = "light" | "dark" | "system";

export const themeScript = `(function(){var d=document.documentElement;d.classList.add("js-enabled");var t=localStorage.getItem("epelawa-theme")||"system";var isDark=false;if(t==="dark")isDark=true;else if(t==="system"){var m=window.matchMedia("(prefers-color-scheme:dark)");isDark=m.matches;}d.dataset.theme=isDark?"dark":"light";d.style.colorScheme=isDark?"dark":"light";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",isDark?"#0A1023":"#F1F4FA");})();`;

export function readStoredTheme(): ThemeChoice {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
        return stored as ThemeChoice;
      }
    } catch {
      // Private mode or locked-down browser
    }
  }
  return "system";
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "light") return "light";
  if (choice === "dark") return "dark";
  // system
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function applyTheme(choice: ThemeChoice): "light" | "dark" {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0A1023" : "#F1F4FA");
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode or locked-down browser
  }
  return resolved;
}

export function toggleTheme(): ThemeChoice {
  const current = readStoredTheme();
  const next: ThemeChoice = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  applyTheme(next);
  return next;
}

export function cycleTheme(): ThemeChoice {
  const current = readStoredTheme();
  const next: ThemeChoice = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  applyTheme(next);
  return next;
}
