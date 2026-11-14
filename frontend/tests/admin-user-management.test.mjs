import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CAPABILITIES, mayManageUsers, safeGrant } from "../apps/admin/lib/user-management.ts";

const actionPath = new URL("../apps/admin/app/(protected)/users/actions.ts", import.meta.url);
const formPath = new URL("../apps/admin/app/(protected)/users/create-user-form.tsx", import.meta.url);
const navigationPath = new URL("../apps/admin/lib/navigation.ts", import.meta.url);
const headerPath = new URL("../apps/admin/components/site-header.tsx", import.meta.url);
const signOutPath = new URL("../apps/admin/app/sign-out/actions.ts", import.meta.url);

test("user-management uses only the 12-key capability catalogue", () => {
  assert.deepEqual([...CAPABILITIES].sort(), [
    "admin.access", "article.create", "article.publish", "article.review", "article.unpublish",
    "audit.read", "business.review", "moderation.review", "order.manage", "people.manage",
    "radio.manage", "staff.manage",
  ].sort());
});

test("only the verified active exact primary administrator with staff.manage qualifies", () => {
  assert.equal(mayManageUsers("info.epelawa@gmail.com", true, true, ["staff.manage"]), true);
  assert.equal(mayManageUsers("info.epelawa@gmail.com", false, true, ["staff.manage"]), false);
  assert.equal(mayManageUsers("info.epelawa@gmail.com", true, false, ["staff.manage"]), false);
  assert.equal(mayManageUsers("other@example.test", true, true, ["staff.manage"]), false);
});

test("primary protection and exact blogger restriction cannot be bypassed by requested grants", () => {
  assert.deepEqual(safeGrant("legateakanjimusab@gmail.com", ["staff.manage", "admin.access", "article.publish"]), ["article.create"]);
  assert.deepEqual(safeGrant("someone@example.test", ["staff.manage", "admin.access", "wat", "article.create", "article.create"]), ["article.create"]);
  assert.deepEqual(safeGrant("info.epelawa@gmail.com", []), ["admin.access", "staff.manage", "audit.read"]);
});

test("no intermediate migration exposes self-service password-flag clearing", async () => {
  const initial = await readFile(new URL("../../backend/supabase/migrations/20261114140000_staff_must_change_password.sql", import.meta.url), "utf8");
  assert.doesNotMatch(initial, /create\s+(?:or\s+replace\s+)?function\s+public\.staff_user_clear_password_change/i);
  assert.doesNotMatch(initial, /grant\s+execute\s+on\s+function\s+public\.staff_user_clear_password_change\(\)\s+to\s+authenticated/i);
});

test("RPCs enforce verified active primary caller, protected targets, and service-role-only password flag clearing", async () => {
  const sql = await readFile(new URL("../../backend/supabase/migrations/20261114142000_admin_user_management_rpcs.sql", import.meta.url), "utf8");
  for (const pattern of [
    /auth\.uid\(\)/, /email_confirmed_at is not null/, /current_staff_is_active\(\)/,
    /public\.has_capability\('staff\.manage'\)/, /primary_admin_protected/,
    /privileged_grant_forbidden/, /restricted_user/, /on conflict\(user_id,capability\) do update/,
    /jsonb_build_object\('capabilities'/, /auth\.role\(\) is distinct from 'service_role'/,
    /revoke all on function public\.staff_user_clear_password_change\(uuid\) from public,anon,authenticated/,
    /grant execute on function public\.staff_user_clear_password_change\(uuid\) to service_role/,
  ]) assert.match(sql, pattern);
  assert.doesNotMatch(sql, /jsonb_build_object\([^\n]*(email|password)/i);
});

test("ordinary admin client enforces forced change and password action verifies current password without logging it", async () => {
  const client = await readFile(new URL("../apps/admin/lib/supabase.ts", import.meta.url), "utf8");
  const action = await readFile(new URL("../apps/admin/app/change-password/actions.ts", import.meta.url), "utf8");
  assert.match(client, /must_change_password/);
  assert.match(client, /allowPasswordChange/);
  assert.match(client, /Password change required/);
  assert.match(action, /signInWithPassword/);
  assert.match(action, /current===password/);
  assert.match(action, /staff_user_clear_password_change/);
  assert.doesNotMatch(action, /console\.(log|info|error)|insert\(/i);
});

test("invite action never generates or returns a password or access token", async () => {
  const action = await readFile(actionPath, "utf8");
  const form = await readFile(formPath, "utf8");
  const invite = action.slice(action.indexOf("export async function inviteUser"));
  assert.match(invite, /inviteUserByEmail/);
  assert.match(invite, /safeGrant\(email, submittedCapabilities\(form\)\)/);
  assert.match(invite, /staff_profiles/);
  assert.match(invite, /staff_user_set_grants/);
  assert.doesNotMatch(action + form, /generateTemporaryPassword|temporary password|result\.password|return\s+\{[^}]*\bpassword\s*:/i);
  assert.doesNotMatch(action + form, /console\.(log|info|error)/i);
  assert.match(form, /Send invitation/);
});

test("new staff profile is created before a capability grant and regular members are not offered staff status actions", async () => {
  const action = await readFile(actionPath, "utf8");
  const page = await readFile(new URL("../apps/admin/app/(protected)/users/page.tsx", import.meta.url), "utf8");
  const invite = action.slice(action.indexOf("export async function inviteUser"));
  assert.ok(invite.indexOf("staff_profiles") < invite.indexOf("staff_user_set_grants"));
  assert.match(action, /isStaff: Boolean\(profile\)/);
  assert.match(page, /u\.isStaff&&<form action=\{setUserActive\}/);
  assert.match(page, /Regular member — no staff profile/);
});

test("capability checkbox, email-confirmation, Auth ban status and safe search pagination contracts exist", async () => {
  const action = await readFile(actionPath, "utf8");
  const page = await readFile(new URL("../apps/admin/app/(protected)/users/page.tsx", import.meta.url), "utf8");
  assert.match(action, /form\.getAll\("capability"\)/);
  assert.match(action, /email_confirmed_at/);
  assert.match(action, /banned_until/);
  assert.match(action, /p_capability: "audit\.read"/);
  assert.match(action, /select\("action,created_at,resource_id,metadata"\)/);
  assert.match(action, /for \(let pageNumber = 1/);
  assert.match(action, /listUsers\(\{ page: requestedPage, perPage: PAGE_SIZE \}\)/);
  assert.match(page, /auditAvailable/);
  assert.doesNotMatch(page, /deleteUser|delete\(/);
});

test("the staff header exposes Users and secure sign-out for the current admin origin", async () => {
  const navigation = await readFile(navigationPath, "utf8");
  const header = await readFile(headerPath, "utf8");
  const action = await readFile(signOutPath, "utf8");
  const adminStyles = await readFile(new URL("../apps/admin/app/globals.css", import.meta.url), "utf8");
  const mainAdminStyles = await readFile(new URL("../apps/main/app/admin/admin-shell.css", import.meta.url), "utf8");
  assert.match(navigation, /label: "Users", href: "\/users"/);
  assert.match(header, /signOutAdminAction\.bind\(null, basePath\)/);
  assert.match(header, /Sign out/);
  assert.match(action, /signOutAdminSession/);
  assert.match(action, /cookieStore\.set\(/);
  assert.match(action, /staffHref\("\/login", basePath\)/);
  assert.match(adminStyles, /\.admin-masthead\s*\{[^}]*background:hsl\(var\(--card\)\)/);
  assert.match(mainAdminStyles, /\.admin-shell \.admin-masthead\s*\{[^}]*background: hsl\(var\(--card\)\)/);
});
