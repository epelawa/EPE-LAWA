import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../../backend/supabase/migrations/20261114223500_news_comments_forward_only.sql', import.meta.url);
const migration = await readFile(migrationPath, 'utf8');

test('forward-only comment reconciliation does not remove schema or seed public content', () => {
  assert.doesNotMatch(migration, /^\s*(DROP|TRUNCATE)\b/im);
  assert.doesNotMatch(migration, /^\s*INSERT\s+INTO\s+public\.(comments|comment_reports)\b/im);
  assert.match(migration, /create table if not exists public\.comments/i);
  assert.match(migration, /create table if not exists public\.comment_reports/i);
});

test('public comment/report projections omit moderation and reporter identity fields', () => {
  assert.match(migration, /grant select \(id, article_id, parent_id, body, state, created_at\) on table public\.comments to anon, authenticated/i);
  assert.match(migration, /grant select \(id, comment_id, reason, note, state, created_at\) on table public\.comment_reports to authenticated/i);
  assert.match(migration, /comments_read_anon_guard_forward[\s\S]*?as restrictive for select to anon/i);
  assert.match(migration, /comments_read_member_guard_forward[\s\S]*?as restrictive for select to authenticated/i);
});

test('report resolution respects live moderation constraints and preserves an audit trail', () => {
  const resolver = migration.match(/create or replace function public\.comment_report_resolve[\s\S]*?\n\$\$;/i)?.[0];
  assert.ok(resolver, 'report resolution function exists');
  assert.match(resolver, /set state = p_action, resolved_by = v_actor, resolved_at = now\(\)/i);
  assert.match(resolver, /audit_event\('staff', 'comment\.report\.'/i);
  assert.doesNotMatch(resolver, /insert into public\.moderation_actions/i);
});
