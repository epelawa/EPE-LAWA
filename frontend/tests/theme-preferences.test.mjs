import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/", import.meta.url);
const read = (path) => readFile(new URL(path, app), "utf8");

test("first visit follows the device setting and explicit choices persist", async () => {
  const theme = await read("lib/theme.ts");
  const toggle = await read("components/theme-toggle.tsx");

  assert.match(theme, /export type ThemeChoice = "light" \| "dark" \| "system"/);
  assert.match(theme, /return "system";/);
  assert.match(theme, /prefers-color-scheme: dark/);
  assert.match(theme, /localStorage\.setItem\(THEME_STORAGE_KEY, choice\)/);
  assert.match(theme, /localStorage\.removeItem\(THEME_STORAGE_KEY\)/);
  assert.match(theme, /window\.matchMedia\?\./);
  assert.match(toggle, /aria-pressed=\{theme === "dark"\}/);
  assert.match(toggle, /applyTheme\(next\)/);
  assert.match(toggle, /window\.dispatchEvent\(new Event\(THEME_PREFERENCE_CHANGED_EVENT\)\)/);
});

test("system-theme explanation is shown once and not over connection or auth notices", async () => {
  const theme = await read("lib/theme.ts");
  const connectivity = await read("app/connectivity.tsx");

  assert.match(theme, /SYSTEM_THEME_NOTICE_STORAGE_KEY = "epelawa-system-theme-notice-seen"/);
  assert.match(theme, /function hasSeenSystemThemeNotice\(\)/);
  assert.match(theme, /function markSystemThemeNoticeSeen\(\)/);
  assert.match(connectivity, /HIDDEN_THEME_MENU_PREFIXES = \["\/auth", "\/login", "\/forgot-password", "\/admin"\]/);
  assert.match(connectivity, /readStoredTheme\(\) !== "system" \|\| hasSeenSystemThemeNotice\(\)/);
  assert.doesNotMatch(connectivity, /SYSTEM_THEME_NOTICE_DURATION_MS|systemThemeDismissTimer/);
  assert.match(connectivity, /if \(systemThemeNotice === null \|\| notice !== null \|\| isThemeNoticeHidden\(pathname\)\) return;\s*markSystemThemeNoticeSeen\(\);/);
  assert.match(connectivity, /const dismissSystemThemeNotice = useCallback\(\(\) => \{\s*markSystemThemeNoticeSeen\(\);\s*setSystemThemeNotice\(null\);\s*\}, \[\]\)/);
  assert.match(connectivity, /notice !== null \|\| isThemeNoticeHidden\(pathname\)/);
  assert.match(connectivity, /role="status" aria-live="polite"/);
  assert.match(connectivity, /aria-label="Dismiss appearance notice"/);
  assert.match(connectivity, /setSystemThemeNotice\(null\)/);
});

test("public theme control is in a reachable drawer, not the masthead", async () => {
  const header = await read("components/site-header.tsx");
  const baseCss = await read("app/globals.css");
  const drawerCss = await read("components/navigation-refinement.css");

  const masthead = header.match(/<div className="masthead-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";
  assert.doesNotMatch(masthead, /ThemeToggle/);
  assert.match(header, /className="drawer-appearance" role="group" aria-label="Appearance settings"[\s\S]*<ThemeToggle \/>/);
  assert.match(baseCss, /\.site-head__menu \{ display: inline-flex; \}/);
  assert.match(drawerCss, /\.drawer-appearance\s*\{[^}]*display: flex/);
  assert.match(drawerCss, /\.drawer-appearance \.theme-control\s*\{[^}]*width: 58px/);
});
