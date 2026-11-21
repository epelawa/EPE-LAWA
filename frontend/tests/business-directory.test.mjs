import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const migration = await readFile(new URL('../../backend/supabase/migrations/20261102200011_business_directory.sql', import.meta.url), 'utf8');
const memberAction = await readFile(new URL('../apps/main/app/business-directory/submit/actions.ts', import.meta.url), 'utf8');
const staffPage = await readFile(new URL('../apps/admin/app/(protected)/business-review/page.tsx', import.meta.url), 'utf8');
const directoryPage = await readFile(new URL('../apps/main/app/business-directory/page.tsx', import.meta.url), 'utf8');
const orderAction = await readFile(new URL('../apps/main/app/business-directory/order-actions.ts', import.meta.url), 'utf8');
const reviewAction = await readFile(new URL('../apps/main/app/business-directory/review-actions.ts', import.meta.url), 'utf8');
test('member submissions require verified auth and use the forced-unpublished RPC', () => {
 assert.match(memberAction, /auth\.getUser\(\)/); assert.match(memberAction, /email_confirmed_at/); assert.match(memberAction, /rpc\("business_submit"/);
 assert.match(memberAction, /return fail\(/);
 assert.match(migration, /if not public\.is_member_active\(\) then[\s\S]*?member_profile_required/); assert.match(migration, /'submitted'\s*\n\s*\);/);
 assert.doesNotMatch(memberAction, /service_role|SUPABASE_SERVICE/);
});
test('public selection does not expose owner id or moderation-private details', () => {
 const publicView = migration.slice(migration.indexOf('create view public.published_businesses'), migration.indexOf('-- RLS', migration.indexOf('create view public.published_businesses')));
 assert.doesNotMatch(publicView, /owner_user_id|verified_by|hidden_reason/);
});
test('staff queue checks business.review and writes only through capability-checked RPCs', () => {
 assert.match(staffPage, /has_capability/); assert.match(staffPage, /business\.review/);
 assert.match(migration, /perform public\.require_capability\('business\.review'\)/);
 assert.match(migration, /business_set_status/); assert.match(migration, /business_verify/);
});
test('member review insert policy requires active non-banned member and published business', () => {
 const policy = migration.slice(migration.indexOf('create policy business_reviews_insert_own'), migration.indexOf('drop policy if exists business_reviews_update_own'));
 assert.match(policy, /is_member_active\(\)/); assert.match(policy, /not public\.is_member_banned\(\)/); assert.match(policy, /b\.status = 'published'/);
});

test('discovery page does not expose marketplace order or review forms', () => {
 assert.doesNotMatch(directoryPage, /OrderRequestForm|submitBusinessReview/);
 assert.match(directoryPage, /business_discovery_search/);
 assert.match(directoryPage, /We couldn’t load the directory/);
});

test('staff can publish a directory listing directly — guarded, audited, no draft', async () => {
  const staffMigration = await readFile(new URL('../../backend/supabase/migrations/20261121230000_business_staff_create.sql', import.meta.url), 'utf8');
  const staffAction = await readFile(new URL('../apps/admin/app/(protected)/business-review/actions.ts', import.meta.url), 'utf8');
  assert.match(staffMigration, /create or replace function public\.business_staff_create/);
  assert.match(staffMigration, /perform public\.require_capability\('business\.review'\)/);
  assert.match(staffMigration, /'published',\s*\n\s*now\(\)/);
  assert.match(staffMigration, /'staff', 'business\.staff_create', 'business'/);
  assert.match(staffMigration, /revoke all on function public\.business_staff_create\([^)]*\) from public, anon/);
  assert.match(staffMigration, /grant execute on function public\.business_staff_create\([^)]*\) to authenticated/);
  assert.doesNotMatch(staffAction, /\.from\("businesses"\)\.(insert|update|upsert|delete)/);
  assert.match(staffAction, /rpc\("business_staff_create"/);
  assert.match(staffAction, /revalidatePath\("\/business-directory"\)/);
  assert.match(staffPage, /BusinessCreateForm/);
  assert.match(staffPage, /Add a business/);
  assert.doesNotMatch(staffPage, /from\("businesses"\)\.insert/);
});
