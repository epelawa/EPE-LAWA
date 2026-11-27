import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('thread-read tracking is stored server-side with member-gated RLS and two RPCs', async () => {
  const migration = await read('backend/supabase/migrations/20261124150000_forum_thread_reads.sql');
  assert.match(migration, /create table if not exists public\.forum_thread_reads/);
  assert.match(migration, /forum_unread_threads/);
  assert.match(migration, /forum_thread_read_mark/);
  assert.match(migration, /is_member_active\(\)/);
  assert.match(migration, /enable row level security/);
});

test('reading a thread pings the read API silently after a short dwell', async () => {
  const ping = await read('frontend/apps/main/app/forum/read-ping.tsx');
  assert.match(ping, /"use client"/);
  assert.match(ping, /window\.setTimeout/);
  assert.match(ping, /2}000|2000/);
  assert.match(ping, /\/api\/forum\/read/);
  assert.match(ping, /\.catch\(\(\) => \{\}\)/, 'failed read marks stay silent');
  const api = await read('frontend/apps/main/app/api/forum/read/route.ts');
  assert.match(api, /forum_thread_read_mark/);
  assert.match(api, /state: "invalid"/);
  assert.match(api, /"guest"/);
});

test('the community home personalises, counts unread, searches, and floats the composer', async () => {
  const home = await read('frontend/apps/main/app/forum/page.tsx');
  assert.match(home, /forum_unread_threads/);
  assert.match(home, /unreadByCategory/);
  assert.match(home, /styles\.fab/);
  assert.match(home, /href="\/forum\/new"/);
  assert.match(home, /ilike\("title"/);
  assert.match(home, /No forum categories are available/);
  assert.match(home, /styles\.welcome/);
  const css = await read('frontend/apps/main/app/forum/forum.module.css');
  assert.match(css, /\.unreadPill/);
  assert.match(css, /\.unreadDot/);
  assert.match(css, /\.chatRow\[data-unread="true"\]/);
  assert.match(css, /\.fab\s*\{[^}]*position: fixed/);
});

test('thread and channel pages read like chat: bubbles, channel rules, composer', async () => {
  const thread = await read('frontend/apps/main/app/forum/thread/[slug]/page.tsx');
  assert.match(thread, /styles\.bubbleOwn/);
  // Turn 3: the composer moved into a client component that keeps the draft on failure.
  assert.match(thread, /<ReplyComposer /);
  const composer = await read('frontend/apps/main/app/forum/reply-composer.tsx');
  assert.match(composer, /styles\.composerForm/);
  assert.match(thread, /<ForumReadPing /);
  assert.match(thread, /user_id,handle,display_name,is_verified,verified_at,deleted_at,avatar_key/);
  const channel = await read('frontend/apps/main/app/forum/category/[slug]/page.tsx');
  assert.match(channel, /channelRules/);
  assert.match(channel, /No public threads in this category yet/);
  const css = await read('frontend/apps/main/app/forum/forum.module.css');
  assert.match(css, /\.bubbleList/);
  assert.match(css, /\.composerPanel/);
});

test('the browser smoke audit covers the newer public routes', async () => {
  const spec = await read('frontend/tests/browser-smoke/public-routes-audit.spec.ts');
  assert.match(spec, /"\/events"/);
  // Turn 5: /radio/archive was removed at the owner's request and now redirects to /radio.
  assert.doesNotMatch(spec, /"\/radio\/archive"/);
  assert.match(spec, /"\/radio\/programmes"/);
});
