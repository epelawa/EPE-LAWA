import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('News comments are rendered from published article scope with anonymous member identity', async () => {
  const [page, component, migration] = await Promise.all([
    read('frontend/apps/main/app/news/[slug]/page.tsx'),
    read('frontend/apps/main/app/news/comment-thread.tsx'),
    read('backend/supabase/migrations/20261107213000_news_comment_workflow.sql'),
  ]);
  assert.match(page, /CommentThread articleId=\{article\.id\}/);
  assert.match(page, /"id,slug,title/);
  assert.match(component, /Community member/);
  assert.match(component, /select\("id,parent_id,body,state,created_at"\)/);
  assert.doesNotMatch(component, /select\([^)]*(email|display_name|author_name)/i);
  assert.match(component, /aria-labelledby="comments-title"/);
  assert.match(component, /role="status"/);
  assert.match(component, /role=\{alertNotice \? "alert" : "status"\}/);
  assert.match(migration, /state = 'deleted'[\s\S]*published_version_id is not null/);
  assert.match(migration, /require_capability\('moderation\.review'\)/);
  assert.match(migration, /moderation_actions/);
  assert.match(migration, /audit_event\('staff', 'comment\.report\.'/);
});

test('Comment server actions bind author identity to verified session and validate report/moderation inputs', async () => {
  const actions = await read('frontend/apps/main/app/news/comment-actions.ts');
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /email_confirmed_at/);
  assert.match(actions, /author_id: user\.id/);
  assert.match(actions, /new Set\(\["spam", "harassment", "hate", "misinformation", "privacy", "other"\]\)/);
  assert.match(actions, /db\.rpc\("comment_moderate"/);
  assert.match(actions, /reason\.length < 5/);
});
