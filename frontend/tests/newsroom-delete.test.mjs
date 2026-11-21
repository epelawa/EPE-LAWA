import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname ?? '.', '../..');
const read = (p) => readFile(path.join(root, p), 'utf8');

test('newsroom delete removes the whole story through the capability-guarded RPC with an explicit confirm', async () => {
  const actions = await read('frontend/apps/admin/lib/actions.ts');
  assert.match(actions, /newsroom_article_delete/);
  assert.match(actions, /confirmDelete[\s\S]{0,400}?delete_confirmation/);
  assert.match(actions, /revalidatePath\(adminHref\("\/newsroom"\)\)/);

  const list = await read('frontend/apps/admin/app/(protected)/newsroom/page.tsx');
  assert.match(list, /deleteArticle/);
  assert.match(list, /has_capability.*article\.publish/s);
  assert.match(list, /Yes, delete forever/);
  assert.match(list, /Removes the story, its versions and its comments from the database\./);

  const editor = await read('frontend/apps/admin/app/(protected)/newsroom/[id]/page.tsx');
  assert.match(editor, /Pause breaking news/);
  assert.match(editor, /Show as breaking news/);
});

test('delete failures explain themselves in plain words', async () => {
  const page = await readFile(new URL('../apps/admin/app/(protected)/newsroom/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /query\.error === "delete_confirmation"/);
  assert.match(page, /Tick the confirm box, then press Yes, delete forever\./);
  assert.match(page, /query\.error === "delete"/);
  assert.match(page, /The story could not be deleted\. Check your article access, reload and try again\./);
});
const migration = await read('backend/supabase/migrations/20261121214500_newsroom_delete_version_guard.sql');
test('the version guard lets only the sanctioned delete action through', async () => {
  assert.match(migration, /current_setting\('app\.newsroom_article_delete', true\) = 'on'/);
  assert.match(migration, /perform set_config\('app\.newsroom_article_delete', 'on', true\);/);
  assert.match(migration, /guard_article_version/);
});
