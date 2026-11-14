import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/main/app/", import.meta.url);
const components = new URL("../apps/main/components/", import.meta.url);
const [page, action, editor, auth, complete, header, sitemap] = await Promise.all([
  readFile(new URL("dashboard/page.tsx", app), "utf8"),
  readFile(new URL("dashboard/actions.ts", app), "utf8"),
  readFile(new URL("dashboard/profile-editor.tsx", app), "utf8"),
  readFile(new URL("auth/actions.ts", app), "utf8"),
  readFile(new URL("auth/complete/page.tsx", app), "utf8"),
  readFile(new URL("site-header.tsx", components), "utf8"),
  readFile(new URL("../../../../docs/03-sitemap.md", app), "utf8"),
]);

test("member dashboard is session-gated, noindex and only reads the signed-in member profile", () => {
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

test("sign-in leads members to the dashboard and the dashboard is linked in the account drawer", () => {
  assert.match(auth, /signInWithPassword[\s\S]*?redirect\("\/dashboard"\)/);
  assert.match(complete, /href="\/dashboard"/);
  assert.match(header, /href="\/dashboard">Member dashboard/);
  assert.match(sitemap, /\/dashboard\s+MOUNTED/);
});
