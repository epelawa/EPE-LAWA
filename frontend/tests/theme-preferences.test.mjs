import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/", import.meta.url);
const read = (path) => readFile(new URL(path, app), "utf8");

test("public site always starts light and ignores OS or stale saved theme preferences", async () => {
  const theme = await read("lib/theme.ts");
  const layout = await read("app/layout.tsx");

  assert.match(theme, /dataset\.theme="light"/);
  assert.match(theme, /style\.colorScheme="light"/);
  assert.match(theme, /localStorage\.removeItem\("epelawa-theme"\)/);
  assert.match(layout, /<html lang=\{siteLanguage === "yo" \? "yo" : "en"\} data-theme="light" style=\{\{ colorScheme: "light" \}\} suppressHydrationWarning>/);
  assert.doesNotMatch(theme, /matchMedia|prefers-color-scheme|data-theme="dark"|colorScheme="dark"/);
  assert.doesNotMatch(layout, /data-theme="dark"|colorScheme: "dark"/);
});

test("public shell has no appearance control or theme-selection behavior", async () => {
  const header = await read("components/site-header.tsx");
  const drawerCss = await read("components/navigation-refinement.css");

  assert.doesNotMatch(header, /ThemeToggle|Appearance|appearance|Member dashboard/);
  assert.doesNotMatch(drawerCss, /drawer-appearance|theme-control/);
});

test("public drawer keeps account entry points and remains keyboard reachable", async () => {
  const header = await read("components/site-header.tsx");
  const drawerCss = await read("components/navigation-refinement.css");

  assert.match(header, /role="dialog" aria-modal="true"/);
  assert.match(header, /renderLink\("\/auth", "Create account", "btn-primary"\)/);
  assert.match(header, /renderLink\("\/login", "Sign in", "btn-secondary"\)/);
  assert.match(header, /aria-label=\{drawerOpen \? "Close navigation menu" : "Open navigation menu"\}/);
  assert.match(header, /document\.addEventListener\("pointerdown", onOutsideDrawer\)/);
  assert.match(drawerCss, /\.drawer-account__actions\s*\{[^}]*display:grid[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
