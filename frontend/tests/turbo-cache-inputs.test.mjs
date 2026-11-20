import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const mainConfig = readJson('../apps/main/turbo.json');
const adminConfig = readJson('../apps/admin/turbo.json');
const rootConfig = readJson('../../turbo.json');

test('cross-app raw imports participate in each app build cache key', () => {
  assert.deepEqual(mainConfig.extends, ['//']);
  assert.deepEqual(adminConfig.extends, ['//']);
  assert.deepEqual(mainConfig.tasks.build.inputs, [
    '$TURBO_DEFAULT$',
    '$TURBO_ROOT$/frontend/apps/admin/app/**',
    '$TURBO_ROOT$/frontend/apps/admin/lib/**',
    '$TURBO_ROOT$/frontend/apps/admin/components/**',
  ]);
  assert.deepEqual(adminConfig.tasks.build.inputs, [
    '$TURBO_DEFAULT$',
    '$TURBO_ROOT$/frontend/apps/main/lib/news-covers.ts',
  ]);
  assert.equal(rootConfig.tasks.build.outputs.includes('.next/**'), true);
  assert.equal(rootConfig.tasks.build.outputs.includes('!.next/cache/**'), true);
  // The maintenance gate must invalidate app builds, so its flag belongs in
  // the root turbo build env allowlist.
  assert.deepEqual(rootConfig.tasks.build.env, [
    'ALLOW_INDEXING',
    'MAINTENANCE_GATE_ENABLED',
    'NEXT_PUBLIC_R2_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_URL',
  ]);
});
