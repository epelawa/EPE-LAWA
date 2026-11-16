/**
 * Theme handling remains API-compatible, but staff workspaces are permanently light.
 * The pre-paint script prevents saved preferences and OS settings from flashing.
 */
export const THEME_STORAGE_KEY = "epelawa-theme";
export type ThemeChoice = "light" | "dark" | "system";

export const themeScript = `(function(){var d=document.documentElement;d.classList.add("js-enabled");d.dataset.theme="light";d.style.colorScheme="light";try{localStorage.removeItem("epelawa-theme");}catch(e){}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#F1F4FA");})();`;

export function readStoredTheme(): ThemeChoice {
  return "light";
}

export function resolveTheme(_choice: ThemeChoice): "light" {
  return "light";
}

export function applyTheme(_choice: ThemeChoice): "light" {
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#F1F4FA");
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Private mode or a locked-down browser. The light theme still applies for this session.
  }
  return "light";
}
