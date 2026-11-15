import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261115010000_forum_moderation_schema_repair.sql', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../frontend/apps/admin/app/(protected)/moderation/forum/page.tsx', import.meta.url), 'utf8');

test('repair provides exactly the relation path and columns consumed by the staff queue', () => {
  for (const table of ['forum_categories', 'forum_threads', 'forum_posts', 'forum_reports']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
  }
  assert.match(migration, /post_id uuid not null references public\.forum_posts\(id\)/);
  assert.match(migration, /thread_id uuid not null references public\.forum_threads\(id\)/);
  assert.match(migration, /title text not null/);
  assert.match(migration, /body text not null/);
  assert.match(page, /from\("forum_reports"\)\.select\(`id, reason, note, created_at, post:post_id\(id, body, state, thread:thread_id\(title\)\)`\)/);
});

test('reports remain private to reporter or moderation.review staff, with no direct resolution writes', () => {
  assert.match(migration, /create policy forum_reports_read_own[\s\S]*?reporter_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /create policy forum_reports_read_staff[\s\S]*?public\.has_capability\('moderation\.review'\)/);
  assert.match(migration, /create policy forum_reports_insert_own[\s\S]*?public\.is_member_active\(\)[\s\S]*?not public\.is_member_banned\(\)/);
  assert.match(migration, /revoke all on table public\.forum_categories, public\.forum_threads, public\.forum_posts, public\.forum_reports/);
  assert.doesNotMatch(migration, /grant\s+(?:update|delete|all)\s+on\s+(?:table\s+)?public\.forum_reports/i);
  assert.match(migration, /perform public\.require_capability\('moderation\.review'\)/);
});

test('report resolution is atomic, limited to supported actions, and audited', () => {
  assert.match(migration, /where r\.id = p_report_id and r\.state = 'open' for update/);
  assert.match(migration, /p_action not in \('hide', 'restore', 'dismiss'\)/);
  assert.match(migration, /public\.forum_post_moderate\(v_post_id, p_action, btrim\(p_reason\)\)/);
  assert.match(migration, /insert into public\.moderation_actions[\s\S]*?'forum_report'[\s\S]*?'dismiss'/);
  assert.match(migration, /public\.audit_event\('staff', 'forum\.report\.resolve'/);
  assert.match(migration, /grant execute on function public\.forum_report_resolve\(uuid, text, text\) to authenticated/);
  assert.doesNotMatch(migration, /\b(drop\s+table|truncate|delete\s+from)\b/i);
});
