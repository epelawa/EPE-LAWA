import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../backend/supabase/migrations/20261107210000_forum_report_resolution.sql', import.meta.url), 'utf8');
const forum = readFileSync(new URL('../../backend/supabase/migrations/20261102200010_forum.sql', import.meta.url), 'utf8');
const page = readFileSync(new URL('../apps/admin/app/(protected)/moderation/forum/page.tsx', import.meta.url), 'utf8');
const action = readFileSync(new URL('../apps/admin/app/(protected)/moderation/forum/actions.ts', import.meta.url), 'utf8');

test('anonymous and ordinary member reads are denied by report RLS; staff capability is required', () => {
  assert.match(forum, /forum_reports_read_staff[\s\S]*?using \(public\.has_capability\('moderation\.review'\)\)/);
  assert.match(forum, /forum_reports_read_own[\s\S]*?using \(reporter_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(forum, /create policy forum_reports_read_public/);
  assert.match(migration, /perform public\.require_capability\('moderation\.review'\)/);
});

test('resolution accepts only supported actions and requires a reason; mutations are audited', () => {
  assert.match(migration, /p_action is null or p_action not in/);
  assert.match(migration, /p_action not in \('hide', 'restore', 'dismiss'\)/);
  assert.match(migration, /char_length\(btrim\(p_reason\)\) > 1000/);
  assert.match(migration, /public\.forum_post_moderate\(v_post_id, p_action, btrim\(p_reason\)\)/);
  assert.match(migration, /moderation_actions[\s\S]*?'forum_report'[\s\S]*?'dismiss'/);
  assert.match(migration, /public\.audit_event\('staff', 'forum\.report\.resolve'/);
  assert.match(migration, /open_report_not_found/);
  assert.match(migration, /reason_required/);
});

test('resolution action redirects after the RPC catch so a committed report is not shown as failed', () => {
  const start = action.indexOf('export async function resolveForumReport');
  const nextExport = action.indexOf('export async function', start + 10);
  const handler = action.slice(start, nextExport === -1 ? undefined : nextExport);
  const catchPosition = handler.indexOf('  } catch {');
  const redirectPosition = handler.lastIndexOf('redirect(');
  assert.ok(catchPosition >= 0);
  assert.ok(redirectPosition > catchPosition);
  assert.equal([...handler.matchAll(/\bredirect\(/g)].length, 1);
  assert.match(handler, /saved = !error;/);
  assert.match(handler, /const result = saved \? "saved" : "failed";/);
});

test('staff UI omits reporter identifiers and uses the secure resolution RPC', () => {
  assert.doesNotMatch(page, /reporter_id|reporter_email|author_email|email/);
  assert.match(page, /\.eq\("state", "open"\)/);
  assert.match(page, /role="alert"/);
  assert.match(page, /No open reports/);
  assert.match(action, /forum_report_resolve/);
  assert.match(action, /allowed\.has\(action\)/);
});
