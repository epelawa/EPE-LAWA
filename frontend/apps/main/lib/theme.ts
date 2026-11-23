/**
 * Theme handling for EPE LAWA
 * Light theme only
 */
export const themeScript = `(function(){var d=document.documentElement;d.classList.add("js-enabled");d.dataset.theme="light";d.style.colorScheme="light";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content","#F1F4FA");})();`;

export function readStoredTheme(): "light" {
  return "light";
}

export function resolveTheme(_choice: string): "light" {
  return "light";
}

export function applyTheme(_choice: string): "light" {
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", "#F1F4FA");
  }
  return "light";
}

export function toggleTheme(): "light" {
  applyTheme("light");
  return "light";
}

export function cycleTheme(): "light" {
  applyTheme("light");
  return "light";
}
