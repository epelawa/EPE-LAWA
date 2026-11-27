import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('the staff client helper bounces dead sessions through login instead of error panels', async () => {
  const supabase = await read('frontend/apps/admin/lib/supabase.ts');
  assert.match(supabase, /import \{ adminRedirect as redirect \} from "\.\/admin-redirect"/);
  const redirectHelper = await read('frontend/apps/admin/lib/admin-redirect.ts');
  assert.match(redirectHelper, /redirect\(standaloneAdminRedirectHref\(href, await headers\(\)\)\)/);
  assert.match(supabase, /export type StaffClient = Awaited<ReturnType<typeof createClient>>/);
  assert.match(supabase, /export async function createStaffClient\(\)/);
  assert.match(supabase, /error\.message !== "Unauthorized"\) throw error/);
  assert.match(supabase, /redirect\("\/login\?reason=session_expired"\)/);
});

test('no protected admin page renders an access-denied panel for a failed session', async () => {
  const pagesDir = new URL('frontend/apps/admin/app/(protected)', root).pathname;
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('error.tsx') && !entry.name.endsWith('layout.tsx')) files.push(full);
    }
  };
  await walk(pagesDir);
  let checked = 0;
  for (const file of files) {
    const src = await readFile(file, 'utf8');
    if (!src.includes('createStaffClient')) continue;
    checked += 1;
    assert.doesNotMatch(src, /await createClient\(\)/, `${file} must stage the staff client through createStaffClient`);
  }
  assert.ok(checked >= 20, `expected the bulk of protected pages converted, found ${checked}`);
});

test('server actions bounce to login instead of swallowing an unauthorized session', async () => {
  const [actions, history, inline, newsSettings, tourism, enquiries] = await Promise.all([
    read('frontend/apps/admin/lib/actions.ts'),
    read('frontend/apps/admin/lib/history-actions.ts'),
    read('frontend/apps/admin/lib/inline-author-actions.ts'),
    read('frontend/apps/admin/lib/newsroom-settings-actions.ts'),
    read('frontend/apps/admin/lib/tourism-actions.ts'),
    read('frontend/apps/admin/app/(protected)/enquiries/actions.ts'),
  ]);
  for (const [name, src] of [['actions', actions], ['history', history], ['inline', inline], ['newsroom-settings', newsSettings], ['tourism', tourism]]) {
    assert.match(src, /createStaffClient/, `${name} actions must bounce on unauthorized`);
    assert.doesNotMatch(src, /try \{\n\s*const (?:supabase|db|client) = await createStaffClient\(\);/, `${name} must hoist the client above its try so the bounce survives`);
  }
  assert.doesNotMatch(enquiries, /try \{\s*const db = await createStaffClient/, 'enquiry resolution must bounce, not fail closed');
});

test('the member dashboard bounces unauthenticated visitors to login', async () => {
  const dashboard = await read('frontend/apps/main/app/dashboard/page.tsx');
  assert.match(dashboard, /if \(authError \|\| !user\) redirect\("\/login\?next=%2Fdashboard"\)/);
  assert.match(dashboard, /if \(profile\.deleted_at\) redirect\("\/login"\)/);
  const recover = await read('frontend/apps/admin/components/admin-access-guard.tsx');
  assert.match(recover, /reason=session_expired/);
});
