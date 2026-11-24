/**
 * Theme handling for EPE LAWA Admin
 * Supports both light and dark themes with JĀSĀB-inspired styling
 */
export const themeScript = `(function(){
  var d = document.documentElement;
  d.classList.add("js-enabled");
  var savedTheme = localStorage.getItem("admin-theme") || "light";
  d.dataset.theme = savedTheme;
  d.dataset.adminTheme = savedTheme;
  d.style.colorScheme = savedTheme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", savedTheme === "dark" ? "#0A1023" : "#F1F4FA");
  }
})();`;

export function readStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("admin-theme") as "light" | "dark" | null;
  return saved || "light";
}

export function resolveTheme(choice: string): "light" | "dark" {
  return choice === "dark" ? "dark" : "light";
}

export function applyTheme(choice: "light" | "dark"): "light" | "dark" {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.adminTheme = resolved;
  document.documentElement.style.colorScheme = resolved;
  localStorage.setItem("admin-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0A1023" : "#F1F4FA");
  }
  return resolved;
}

export function toggleTheme(): "light" | "dark" {
  const current = readStoredTheme();
  const next = current === "light" ? "dark" : "light";
  return applyTheme(next);
}

export function cycleTheme(): "light" | "dark" {
  const current = readStoredTheme();
  const next = current === "light" ? "dark" : "light";
  return applyTheme(next);
}
