import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/app/", import.meta.url);
const components = new URL("../apps/main/components/", import.meta.url);
const read = (base, path) => readFile(new URL(path, base), "utf8");

test("account routes share a centered branded shell, theme control, and no public navigation chrome", async () => {
  const [shell, controls, styles, globalStyles] = await Promise.all([
    read(components, "account-shell.tsx"),
    read(components, "focused-page-controls.tsx"),
    read(app, "auth/auth.css"),
    read(app, "globals.css"),
  ]);

  assert.match(shell, /className="auth-page"/);
  assert.match(shell, /className="auth-card"/);
  assert.match(shell, /<FocusedPageControls\s*\/>/);
  assert.match(controls, /BrandLockup size=\{32\} showPlace=\{false\}/);
  assert.match(controls, /<ThemeToggle\s*\/>/);
  assert.match(shell, /aria-labelledby="auth-title"/);
  assert.match(styles, /\.auth-page\s*\{[^}]*place-items:\s*center/s);
  assert.match(styles, /\.auth-card\s*\{[^}]*max-width:\s*480px/s);
  assert.match(globalStyles, /body:has\(\.auth-page\) \.site-head/);
  assert.match(globalStyles, /body:has\(\.auth-page\) \.site-footer/);

  for (const route of [
    "login/page.tsx",
    "auth/page.tsx",
    "forgot-password/page.tsx",
    "auth/new-password/page.tsx",
    "auth/complete/page.tsx",
  ]) {
    const source = await read(app, route);
    assert.match(source, /<AccountShell\b/, `${route} should use the shared auth shell`);
  }
});

test("callback issue, 404, and runtime error screens retain shared controls and hide public chrome", async () => {
  const [globalStyles, errorPage, notFound, linkIssue, controls] = await Promise.all([
    read(app, "globals.css"),
    read(app, "error.tsx"),
    read(app, "not-found.tsx"),
    read(app, "auth/link-issue-view.tsx"),
    read(components, "focused-page-controls.tsx"),
  ]);

  assert.match(globalStyles, /body:has\(\.auth-link-issue\) \.site-head/);
  assert.match(globalStyles, /body:has\(\.auth-link-issue\) \.site-footer/);
  assert.match(globalStyles, /body:has\(\.focused-error-shell\) \.site-head/);
  assert.match(globalStyles, /body:has\(\.focused-error-shell\) \.site-footer/);
  assert.match(errorPage, /className="focused-error-shell"/);
  assert.match(errorPage, /<FocusedPageControls\s*\/>/);
  assert.match(notFound, /className="focused-error-shell"/);
  assert.match(notFound, /<FocusedPageControls\s*\/>/);
  assert.match(linkIssue, /className="auth-link-issue"/);
  assert.match(linkIssue, /<FocusedPageControls\s*\/>/);
  assert.match(controls, /<ThemeToggle\s*\/>/);
});

test("storage and connectivity notices do not overlay focused auth or error actions", async () => {
  const [styles, banner] = await Promise.all([
    read(app, "notice-refinement.css"),
    read(components, "cookie-banner.tsx"),
  ]);

  for (const routeClass of ["auth-page", "auth-link-issue", "focused-error-shell"]) {
    assert.ok(styles.includes(`body:has(.${routeClass}) .storage-notice`));
    assert.ok(styles.includes(`body:has(.${routeClass}) .toast-region:empty`));
    assert.ok(styles.includes(`body:has(.${routeClass}) .toast-region:not(:empty)`));
  }
  assert.match(styles, /position:\s*static/);
  assert.match(banner, /Your theme and this choice stay in your browser/);
  assert.match(banner, /Privacy notice/);
});
