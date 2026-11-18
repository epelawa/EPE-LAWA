import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const rootPath = fileURLToPath(root);
const readSync = (path) => readFileSync(resolve(rootPath, path), 'utf8');
test('newsroom settings remain available through the setup-incomplete flow', async () => {
  const [newsroom, create, settings] = await Promise.all([
    read('frontend/apps/admin/app/(protected)/newsroom/page.tsx'),
    read('frontend/apps/admin/app/(protected)/newsroom/new/page.tsx'),
    read('frontend/apps/admin/app/(protected)/newsroom/settings/page.tsx'),
  ]);
  assert.doesNotMatch(newsroom, /href=\{adminHref\("\/newsroom\/settings"\)\}/);
  assert.match(create, /Manage categories & bylines/);
  assert.match(create, /categories\.length === 0 \|\| authors\.length === 0/);
  assert.match(settings, /p_capability: "article\.publish"/);
  assert.match(settings, /categories"\)\.select\("id,slug,label,description,sort_order,is_active"\)/);
  assert.match(settings, /authors"\)\.select\("id,slug,display_name,bio,photo_key"\)/);
  assert.match(settings, /records are never deleted/);
});
test('same-origin newsroom settings route re-exports the canonical page inside the existing staff auth boundary', () => {
  const wrapperPath = 'frontend/apps/main/app/admin/(protected)/newsroom/settings/page.tsx';
  const wrapper = readSync(wrapperPath);
  assert.match(wrapper, /^export \{ default \} from ["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/admin\/app\/\(protected\)\/newsroom\/settings\/page["'];?\s*$/);
  const importPath = wrapper.match(/from\s+["']([^"']+)["']/)?.[1];
  assert.ok(importPath, 'route default export points to an explicit canonical page');
  assert.ok(existsSync(resolve(dirname(resolve(rootPath, wrapperPath)), `${importPath}.tsx`)), 'canonical page path resolves');
  const protectedLayout = readSync('frontend/apps/main/app/admin/(protected)/layout.tsx');
  assert.match(protectedLayout, /AdminAccessGuard/);
  assert.match(protectedLayout, /loginPath="\/admin\/login"/);
  const canonical = readSync('frontend/apps/admin/app/(protected)/newsroom/settings/page.tsx');
  assert.match(canonical, /p_capability: "article\.publish"/);
  assert.match(canonical, /!authorized \?/);
});
test('reference settings server actions call only validated RPCs and never expose database error text', async () => {
  const [action, migration] = await Promise.all([
    read('frontend/apps/admin/lib/newsroom-settings-actions.ts'),
    read('backend/supabase/migrations/20261115011000_newsroom_reference_settings.sql'),
  ]);
  assert.match(action, /rpc\(rpc, args\)/);
  assert.match(action, /result\.error\.code === "23505" \? "conflict" : "failed"/);
  assert.doesNotMatch(action, /\.from\("(categories|authors)"\)\.(insert|update|upsert|delete)/);
  assert.match(migration, /perform public\.require_capability\('article\.publish'\)/g);
  assert.equal((migration.match(/perform public\.require_capability\('article\.publish'\)/g) ?? []).length, 2);
  assert.match(migration, /perform public\.audit_event\(/g);
  assert.match(migration, /set search_path = ''/g);
  assert.doesNotMatch(migration, /\b(drop|delete from|truncate)\b/i);
  assert.match(migration, /revoke all on function public\.newsroom_category_save[\s\S]*from public, anon/);
  assert.match(migration, /grant execute on function public\.newsroom_byline_save[\s\S]*to authenticated/);
});
