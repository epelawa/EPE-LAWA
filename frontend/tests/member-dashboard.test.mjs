import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/app/", import.meta.url);
const components = new URL("../apps/main/components/", import.meta.url);
const [page, action, editor, auth, complete, header, sitemap, globalStyles, footer] = await Promise.all([
  readFile(new URL("dashboard/page.tsx", app), "utf8"),
  readFile(new URL("dashboard/actions.ts", app), "utf8"),
  readFile(new URL("dashboard/profile-editor.tsx", app), "utf8"),
  readFile(new URL("auth/actions.ts", app), "utf8"),
  readFile(new URL("auth/complete/page.tsx", app), "utf8"),
  readFile(new URL("site-header.tsx", components), "utf8"),
  readFile(new URL("../../../../docs/03-sitemap.md", app), "utf8"),
  readFile(new URL("globals.css", app), "utf8"),
  readFile(new URL("../components/site-footer.tsx", app), "utf8"),
]);

test("member dashboard is session-gated, noindex and only reads the signed-in member profile", () => {
  assert.equal((page.match(/<main className=\{`\$\{styles\.shell\} member-dashboard-shell`\}/g) ?? []).length, 3, "all dashboard render states must hide the shared footer");
  assert.match(globalStyles, /body:has\(\.member-dashboard-shell\) \.site-footer\s*\{\s*display:\s*none;\s*\}/);
  assert.match(globalStyles, /body:has\(\.auth-page\) \.site-footer/);
  assert.match(footer, /footerNavigation\.map/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /redirect\("\/login\?next=%2Fdashboard"\)/);
  assert.match(page, /\.select\("user_id, handle, display_name, deleted_at"\)/);
  assert.match(page, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(page, /SERVICE_ROLE|service_role|email_address|view_count|fake|mock/i);
});

test("member profile editor updates only the authenticated user's name and handle", () => {
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.ok(action.indexOf("supabase.auth.getUser()") < action.indexOf('text(data, "displayName")'));
  assert.match(action, /\.update\(\{ display_name: displayName, handle \}\)/);
  assert.match(action, /\.eq\("user_id", user\.id\)/);
  assert.match(action, /RESERVED_HANDLES/);
  assert.match(action, /23505/);
  assert.doesNotMatch(action, /user_id\s*:\s*|is_verified|verified_by|deleted_at|email\s*:/);
  assert.match(editor, /name="displayName"/);
  assert.match(editor, /name="handle"/);
  assert.match(editor, /role=\{state\.status === "error" \? "alert" : "status"\}/);
});

test("sign-in leads members through completion and the dashboard is linked in More", () => {
  const moreMenu = header.match(/<ul className="nav-more__list">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  assert.match(auth, /signInWithPassword[\s\S]*?redirect\("\/auth\/complete"\)/);
  assert.match(complete, /href="\/dashboard"/);
  assert.match(moreMenu, /href="\/dashboard"[^>]*>\s*Member dashboard\s*<\/Link>/);
  assert.match(sitemap, /\/dashboard\s+MOUNTED/);
});

test("admin sign-in preserves the compact navy shell and disabled Google row without continuous logo movement", async () => {
  const [authStyles, adminLogin, adminForm, brand] = await Promise.all([
    readFile(new URL("auth/auth.css", app), "utf8"),
    readFile(new URL("admin/login/page.tsx", app), "utf8"),
    readFile(new URL("../components/admin-login-form.tsx", app), "utf8"),
    readFile(new URL("../components/brand.tsx", app), "utf8"),
  ]);
  assert.doesNotMatch(authStyles, /animation:\s*[^;}]*infinite/i);
  assert.doesNotMatch(brand, /animation|keyframes|translateY/);
  assert.match(authStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(adminLogin, /<AccountShell/);
  assert.match(adminForm, /disabled aria-disabled="true" aria-label="Google sign-in, Coming Soon"/);
  assert.match(authStyles, /html\[data-theme="dark"\] \.auth-page[\s\S]*?var\(--palette-navy\)/);
});
