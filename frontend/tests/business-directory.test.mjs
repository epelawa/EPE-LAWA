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
 assert.match(memberAction, /submission_error=/);
 assert.match(migration, /if not public\.is_member_active\(\) then[\s\S]*?member_profile_required/); assert.match(migration, /'submitted'\s*\n\s*\);/);
 assert.doesNotMatch(memberAction, /service_role|SUPABASE_SERVICE/);
});
test('public selection does not expose owner id or moderation-private details', () => {
 const publicView = migration.slice(migration.indexOf('create view public.published_businesses'), migration.indexOf('-- RLS', migration.indexOf('create view public.published_businesses')));
 assert.doesNotMatch(publicView, /owner_user_id|verified_by|hidden_reason/);
});
test('staff queue checks business.review and writes only through capability-checked RPCs', () => {
 assert.match(staffPage, /staff_capability_grants/); assert.match(staffPage, /business\.review/);
 assert.match(migration, /perform public\.require_capability\('business\.review'\)/);
 assert.match(migration, /business_set_status/); assert.match(migration, /business_verify/);
});
test('member review insert policy requires active non-banned member and published business', () => {
 const policy = migration.slice(migration.indexOf('create policy business_reviews_insert_own'), migration.indexOf('drop policy if exists business_reviews_update_own'));
 assert.match(policy, /is_member_active\(\)/); assert.match(policy, /not public\.is_member_banned\(\)/); assert.match(policy, /b\.status = 'published'/);
});

test('order and review redirects have distinct user-visible result feedback', () => {
 assert.match(orderAction, /redirect\("\/business-directory\?order=requested"\)/);
 assert.match(orderAction, /business_error=verify-email/);
 assert.match(reviewAction, /redirect\("\/business-directory\?review=sent"\)/);
 assert.match(reviewAction, /business_error=verify-email/);
 assert.match(directoryPage, /Your unpaid order request was saved/);
 assert.match(directoryPage, /No payment was taken/);
 assert.match(directoryPage, /We could not confirm whether your unpaid order request was saved/);
 assert.match(directoryPage, /Your review was submitted/);
 assert.match(directoryPage, /You have already submitted a review/);
 assert.match(directoryPage, /searchParams: Promise<Search>/);
 assert.match(directoryPage, /params\.business_error/);
});
