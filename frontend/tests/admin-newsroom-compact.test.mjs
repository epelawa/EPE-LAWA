import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('newsroom list presents a compact state selector without revision or counts', async () => {
  const page = await read('../apps/admin/app/(protected)/newsroom/page.tsx');
  const filter = await read('../apps/admin/components/newsroom-filter.tsx');
  assert.match(page, /<NewsroomFilter state=/);
  assert.match(page, /current_version:current_version_id!inner/);
  assert.doesNotMatch(page, /Newsroom counts|Revision \{article\.revision\}|Categories & bylines|Current version and publication state/);
  assert.match(filter, /aria|sr-only/);
  for (const state of ['draft', 'review', 'approved', 'rejected', 'published']) assert.match(filter, new RegExp(`value="${state}"`));
});

test('dashboard retains capability-checked counts without workflow cards', async () => {
  const page = await read('../apps/admin/app/(protected)/page.tsx');
  assert.match(page, /countForCapability/);
  assert.doesNotMatch(page, /Workflows available to your role|Request-scoped overview|Counts only, no private records/);
});
