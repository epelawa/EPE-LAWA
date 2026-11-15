import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('newsroom creation reads the effective role-aware capability and distinguishes an unavailable check', async () => {
  const page = await read('frontend/apps/admin/app/(protected)/newsroom/new/page.tsx');

  assert.match(page, /rpc\("has_capability", \{ p_capability: "article\.create" \}\)/);
  assert.match(page, /capabilityResult\.data === true/);
  assert.match(page, /accessCheckUnavailable \? "Newsroom authorization unavailable"/);
  assert.match(page, /Your staff access could not be verified\. No draft was created\./);

});

test('the article-create server action remains database-RPC-only and the RPC enforces article.create', async () => {
  const [action, transition, foundation, sessionGuard, staffClient] = await Promise.all([
    read('frontend/apps/admin/lib/actions.ts'),
    read('backend/supabase/migrations/20261102200006_staff_transitions.sql'),
    read('backend/supabase/migrations/20261102133703_staff_access_foundation.sql'),
    read('frontend/apps/admin/lib/supabase-access.ts'),
    read('frontend/apps/admin/lib/supabase.ts'),
  ]);

  assert.match(action, /supabase\.rpc\("article_create_with_cover"/);
  assert.match(action, /normalizeExternalNewsCoverUrl/);
  assert.match(action, /invalidCover\(formData\)/);
  assert.doesNotMatch(action, /\.from\("articles"\)\.(insert|update|upsert|delete)/);
  assert.match(transition, /perform public\.require_capability\('article\.create'\)/);
  assert.match(foundation, /create policy staff_read_own_active_capability[\s\S]*?\(select auth\.uid\(\)\) = user_id[\s\S]*?profile\.is_active = true/);
  assert.match(sessionGuard, /fetch\(`\$\{url\}\/rest\/v1\/rpc\/has_capability`,\s*\{\s*cache: "no-store"/);
  assert.match(staffClient, /getAdminAccessForSession/);
  assert.match(staffClient, /Authorization: `Bearer \$\{session\.access_token\}`/);
});
