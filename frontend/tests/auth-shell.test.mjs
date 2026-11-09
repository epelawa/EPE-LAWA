import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/app/", import.meta.url);
const components = new URL("../apps/main/components/", import.meta.url);
const read = (base, path) => readFile(new URL(path, base), "utf8");

test("member auth routes use a centered branded shell without manual theme controls", async () => {
  const [shell, controls, styles, globalStyles, rootLayout, brand, theme] = await Promise.all([
    read(components, "account-shell.tsx"),
    read(components, "focused-page-controls.tsx"),
    read(app, "auth/auth.css"),
    read(app, "globals.css"),
    read(app, "layout.tsx"),
    read(components, "brand.tsx"),
    read(app, "../lib/theme.ts"),
  ]);

  assert.match(shell, /className="auth-page"/);
  assert.match(shell, /className="auth-frame"/);
  assert.match(shell, /className="auth-art"/);
  assert.match(shell, /className="auth-card"/);
  assert.match(shell, /<FocusedPageControls showThemeToggle=\{showThemeToggle\}/);
  assert.match(shell, /showThemeToggle = false/);
  assert.match(shell, /showThemeToggle\?: boolean/);
  assert.match(controls, /BrandLockup size=\{32\}/);
  assert.doesNotMatch(brand, /showPlace|Epe Division|brand__place/);
  assert.match(controls, /showThemeToggle \? <ThemeToggle \/> : null/);
  assert.match(styles, /\.auth-page\s*\{[^}]*place-items:\s*center/s);
  assert.match(styles, /var\(--storage-notice-height,\s*0px\)/);
  assert.doesNotMatch(styles, /var\(--storage-notice-height,\s*148px\)/);
  assert.match(styles, /auth-step-actions\[data-enhanced="false"\] \.auth-step-back/);
  assert.match(styles, /auth-step-actions\[data-enhanced="true"\]\[data-step="1"\] \.auth-step-back/);
  assert.match(styles, /auth-step-actions\[data-enhanced="true"\]\[data-total="4"\]\[data-step="3"\] \.auth-step-continue/);
  assert.match(styles, /\.auth-art::before/);
  assert.match(styles, /\.auth-card\s*\{[^}]*margin:\s*-42px/s);
  assert.match(styles, /\.auth-field input\s*\{[^}]*border-radius:\s*999px/s);
  assert.match(styles, /\.auth-password-toggle\s*\{[^}]*min-height:\s*46px/s);
  assert.match(styles, /\.auth-provider__button:disabled/);
  assert.match(styles, /\.auth-form \{ gap: 10px; \}/);
  assert.match(styles, /@media \(max-height: 600px\)/);
  assert.match(styles, /@media \(max-height: 560px\)/);
  assert.match(styles, /@media \(max-width: 360px\) and \(max-height: 680px\)/);
  assert.match(styles, /\.auth-card\s*\{\s*margin-top:\s*-6px;[^}]*padding:\s*4px 10px/s);
  assert.match(styles, /\.auth-step-continue \{ background: var\(--palette-cobalt\); color: var\(--palette-midnight\); \}/);
  assert.match(styles, /min\(var\(--storage-notice-height, 0px\), 124px\)/);
  assert.match(styles, /\.auth-footnote-links a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(styles, /\.auth-switch a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(styles, /\.auth-secondary-link a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(styles, /\.auth-switch--member\s*\{[^}]*flex-wrap:\s*nowrap/s);
  assert.doesNotMatch(styles, /\.auth-provider\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(shell, /className="auth-home"/);
  assert.match(globalStyles, /body:has\(\.auth-page\) \.site-head/);
  assert.match(globalStyles, /body:has\(\.auth-page\) \.site-footer/);
  assert.match(rootLayout, /themeScript/);
  assert.match(rootLayout, /export const viewport: Viewport = \{ themeColor: "#F1F4FA" \}/);
  assert.match(theme, /t==="dark"\?"#17264A":"#F1F4FA"/);
  assert.match(theme, /document\.querySelector\('meta\[name="theme-color"\]'\)/);
  assert.match(rootLayout, /strategy="beforeInteractive"/);

  for (const route of [
    "login/page.tsx",
    "auth/page.tsx",
    "forgot-password/page.tsx",
    "auth/new-password/page.tsx",
    "auth/complete/page.tsx",
  ]) {
    const source = await read(app, route);
    assert.match(source, /<AccountShell\b/, `${route} should use the shared auth shell`);
    if (route !== "auth/complete/page.tsx") {
      assert.match(source, /showThemeToggle=\{false\}/, `${route} should hide the manual toggle`);
    }
  }

  const staffLogin = await read(app, "admin/login/page.tsx");
  const staffForm = await read(components, "admin-login-form.tsx");
  const adminStyles = await read(app, "admin/admin-shell.css");
  const notices = await read(app, "notice-refinement.css");
  const memberLogin = await read(app, "login/page.tsx");
  assert.match(staffLogin, /<AccountShell\b/);
  assert.match(staffLogin, /safeAdminNextPath\(nextValue\)/);
  assert.match(staffLogin, /<AdminLoginForm nextPath=\{nextPath\}/);
  assert.match(staffLogin, /className="auth-switch auth-switch--staff"[\s\S]*href="\/login">Member sign in[\s\S]*href="\/contact">Contact us/);
  assert.match(memberLogin, /className="auth-switch auth-switch--member"[\s\S]*href="\/auth">Create an account[\s\S]*href="\/forgot-password">Forgot password/);
  assert.match(staffForm, /name="next" value=\{nextPath\}/);
  assert.match(staffForm, /id="admin-login-email"/);
  assert.match(staffForm, /id="admin-login-password"/);
  assert.match(staffForm, /disabled aria-disabled="true" aria-label="Google sign-in, Coming Soon"/);
  assert.match(staffForm, /aria-pressed=\{visible\}/);
  assert.match(adminStyles, /body:has\(\.admin-shell \.auth-page\) \.admin-masthead/);
  assert.match(adminStyles, /@media \(max-width: 480px\) and \(max-height: 680px\)/);
  assert.doesNotMatch(notices, /body:has\(\.admin-shell \.auth-page\) \.storage-notice/);
});

test("callback issue, 404, and runtime error screens keep shared controls and hide public chrome", async () => {
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
  assert.match(controls, /showThemeToggle \? <ThemeToggle \/> : null/);
});

test("storage notice is homepage-only and leaves auth screens unobstructed", async () => {
  const [styles, authStyles, banner, layout, home, staffForm] = await Promise.all([
    read(app, "notice-refinement.css"),
    read(app, "auth/auth.css"),
    read(components, "cookie-banner.tsx"),
    read(app, "layout.tsx"),
    read(app, "page.tsx"),
    read(components, "admin-login-form.tsx"),
  ]);

  assert.match(styles, /body:has\(.public-home\) \.storage-notice\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /body:not\(:has\(.public-home\)\) \.storage-notice\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /@media \(max-width: 340px\) and \(max-height: 640px\)/);
  assert.match(styles, /body:has\(.public-home \.storage-notice\) \.home-hero \.ui-actions \{ margin-top: 16px; gap: 8px; \}/);
  assert.doesNotMatch(styles, /body:has\(\.(?:auth-page|auth-link-issue|focused-error-shell|admin-shell)\) \.storage-notice/);
  assert.match(authStyles, /padding-bottom:\s*calc\(var\(--storage-notice-height,\s*0px\)/s);
  assert.doesNotMatch(layout, /CookieBanner/);
  assert.match(home, /CookieBanner/);
  for (const routeClass of ["auth-page", "auth-link-issue", "focused-error-shell"]) {
    assert.ok(styles.includes(`body:has(.${routeClass}) .toast-region:empty`));
    assert.ok(styles.includes(`body:has(.${routeClass}) .toast-region:not(:empty)`));
  }
  assert.match(banner, /role="region"/);
  assert.match(banner, /ResizeObserver/);
  assert.match(banner, /--storage-notice-height/);
  assert.match(authStyles, /\.auth-page:has\(\.admin-login__form \.auth-error\)\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(authStyles, /\.auth-page:has\(\.admin-login__form \.auth-error\) \.auth-art__description\s*\{[^}]*display:\s*none/s);
  assert.match(authStyles, /\.auth-page:has\(\.admin-login__form \.auth-error\) \.auth-feedback\s*\{[^}]*padding:\s*4px 8px/s);
  assert.match(staffForm, /page\.scrollHeight > page\.clientHeight/);
  assert.match(staffForm, /page\.scrollTop = page\.scrollHeight/);
  assert.match(banner, /Theme stays on this device\. Sign-in uses essential cookies; optional tracking is off\./);
  assert.match(banner, /epelawa_cookie_consent/);
  assert.match(banner, /window\.removeEventListener\("resize", apply\);\s*root\.style\.setProperty\("--storage-notice-height", "0px"\)/);
  assert.doesNotMatch(banner, /role="dialog"/);
});
