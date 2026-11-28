import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const repo = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("capability catalogue lives in a server-safe module", () => {
  const lib = repo("frontend/apps/admin/lib/capability-groups.ts");
  assert.ok(!lib.includes('"use client"'), "capability-groups.ts must never be a client module");
  assert.match(lib, /export const CAPABILITY_GROUPS/);
  const page = repo("frontend/apps/admin/app/(protected)/roles/page.tsx");
  assert.match(page, /lib\/capability-groups/);
  const picker = repo("frontend/apps/admin/components/roles-capability-picker.tsx");
  assert.match(picker, /from "\.\.\/lib\/capability-groups"/);
});

test("staff content management migration defines the audited RPCs", () => {
  const sql = repo("backend/supabase/migrations/20261125140000_staff_content_management.sql");
  for (const name of [
    "business_staff_update",
    "business_staff_delete",
    "forum_staff_thread_delete",
    "forum_staff_post_delete",
    "forum_staff_post_restore",
    "comment_staff_update",
    "comment_staff_delete",
  ]) {
    assert.ok(sql.includes(`function public.${name}(`), `migration should define ${name}`);
  }
  assert.match(sql, /require_capability\('business\.review'\)/);
  assert.match(sql, /require_capability\('moderation\.review'\)/);
  assert.match(sql, /public\.audit_event\('staff', 'business\.staff_delete'/);
  const grants = sql.match(/grant execute on function public\.\w+\(/g) ?? [];
  assert.equal(grants.length, 7, "every RPC must be granted to authenticated only");
});

test("forum moderation desk can remove chats, messages and restore posts", () => {
  const page = repo("frontend/apps/admin/app/(protected)/moderation/forum/page.tsx");
  assert.ok(page.includes("deleteForumThread") && page.includes("deleteForumPost") && page.includes("restoreForumPost"));
  const actions = repo("frontend/apps/admin/app/(protected)/moderation/forum/actions.ts");
  assert.match(actions, /forum_staff_thread_delete/);
  assert.match(actions, /forum_staff_post_delete/);
  assert.match(actions, /forum_staff_post_restore/);
});

test("article comments desk is wired on both apps", () => {
  const page = repo("frontend/apps/admin/app/(protected)/moderation/comments/page.tsx");
  assert.match(page, /comment_staff_update|editComment/);
  const actions = repo("frontend/apps/admin/app/(protected)/moderation/comments/actions.ts");
  assert.match(actions, /comment_staff_update/);
  assert.match(actions, /comment_staff_delete/);
  const stub = repo("frontend/apps/main/app/admin/(protected)/moderation/comments/page.tsx");
  assert.match(stub, /export \{ default \}/);
  const nav = repo("frontend/apps/admin/lib/navigation.ts");
  assert.match(nav, /"\/moderation\/comments"/);
});

test("business review page manages published listings", () => {
  const page = repo("frontend/apps/admin/app/(protected)/business-review/page.tsx");
  assert.match(page, /Live listings/);
  assert.match(page, /BusinessEditForm/);
  assert.match(page, /deleteBusiness/);
  const actions = repo("frontend/apps/admin/app/(protected)/business-review/actions.ts");
  assert.match(actions, /business_staff_update/);
  assert.match(actions, /business_staff_delete/);
});
