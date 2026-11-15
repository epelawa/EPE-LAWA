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
});

test("system-theme selection applies without a toast overlay", async () => {
  const theme = await read("lib/theme.ts");
  const connectivity = await read("app/connectivity.tsx");
  const toggle = await read("components/theme-toggle.tsx");

  assert.match(theme, /export type ThemeChoice = "light" \| "dark" \| "system"/);
  assert.match(theme, /prefers-color-scheme: dark/);
  assert.match(toggle, /setTheme\(resolveTheme\(readStoredTheme\(\)\)\)/);
  assert.match(toggle, /setTheme\(applyTheme\(next\)\)/);
  assert.match(toggle, /applyTheme\("system"\)/);
  assert.doesNotMatch(connectivity, /ThemeToast|Device theme applied|systemThemeNotice|SYSTEM_THEME_NOTICE/);
  assert.doesNotMatch(theme, /SYSTEM_THEME_NOTICE|hasSeenSystemThemeNotice|markSystemThemeNoticeSeen/);
  assert.match(connectivity, /role="status" aria-live="polite"/);
  assert.match(connectivity, /role="alert" aria-live="assertive"/);
  assert.match(connectivity, /You’re offline|Service unavailable|Retry/);
});

test("public theme control is in a reachable drawer, not the masthead", async () => {
  const header = await read("components/site-header.tsx");
  const drawerCss = await read("components/navigation-refinement.css");

  const masthead = header.match(/<div className="masthead-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";
  assert.doesNotMatch(masthead, /ThemeToggle/);
  assert.match(header, /className="drawer-appearance" role="group" aria-label="Appearance settings"[\s\S]*<ThemeToggle \/>/);
  assert.match(drawerCss, /\.site-head__menu \{ display: inline-flex;/);
  assert.match(drawerCss, /\.drawer-appearance\s*\{[^}]*display: flex/);
  assert.match(drawerCss, /\.drawer-appearance \.theme-control\s*\{[^}]*width: 58px/);
});
