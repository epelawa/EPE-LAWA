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
