import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;`);
for (const name of ['20261118030000_newsletter_subscriptions.sql', '20261118053000_pause_unsafe_newsletter_signup.sql', '20261119010000_newsletter_verified_requests.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
const hash = c => c.repeat(64);
const request = (email, c, u = 'b', otp = 'c') => db.query('select public.newsletter_request_verified($1,$2,$3,$4) as result', [email, hash(c), hash(u), hash(otp)]);
const confirm = c => db.query('select public.newsletter_confirm_verified($1) as result', [hash(c)]);
const subscriber = email => db.query('select status, unsubscribe_token_hash from public.newsletter_subscribers where email=$1', [email]);
test('client roles cannot invoke privileged operations or read pending data', async () => {
  const result = await db.query(`select has_function_privilege('anon','public.newsletter_request_verified(text,text,text,text)','execute') anon_request, has_function_privilege('authenticated','public.newsletter_confirm_verified(text)','execute') auth_confirm, has_function_privilege('service_role','public.newsletter_confirm_verified(text)','execute') service_confirm, has_table_privilege('anon','public.newsletter_pending_confirmations','select') anon_read`);
  assert.deepEqual(result.rows[0], { anon_request: false, auth_confirm: false, service_confirm: true, anon_read: false });
});
test('proof is required, single-use and preserves active subscriber token', async () => {
  assert.equal((await request('reader@example.invalid', 'a')).rows[0].result, true);
  assert.equal((await subscriber('reader@example.invalid')).rows.length, 0);
  assert.equal((await confirm('d')).rows[0].result, 'invalid');
  assert.equal((await confirm('a')).rows[0].result, 'activated');
  assert.equal((await confirm('a')).rows[0].result, 'invalid');
  assert.deepEqual((await subscriber('reader@example.invalid')).rows[0], { status: 'active', unsubscribe_token_hash: hash('b') });
  assert.equal((await request('reader@example.invalid', 'd', 'e')).rows[0].result, false);
  await db.query("update public.newsletter_request_cooldowns set last_requested_at=now()-interval '2 minutes' where email=$1", ['reader@example.invalid']);
  await request('reader@example.invalid', 'd', 'e');
  assert.equal((await confirm('d')).rows[0].result, 'already_active');
  assert.deepEqual((await subscriber('reader@example.invalid')).rows[0], { status: 'active', unsubscribe_token_hash: hash('b') });
});
test('confirmation reactivates unsubscribed addresses and preserves unsubscribe function', async () => {
  await db.query('select public.newsletter_unsubscribe($1)', [hash('b')]);
  await db.query("update public.newsletter_request_cooldowns set last_requested_at=now()-interval '2 minutes' where email=$1", ['reader@example.invalid']);
  await request('reader@example.invalid', 'f', 'e'); assert.equal((await confirm('f')).rows[0].result, 'activated');
  assert.deepEqual((await subscriber('reader@example.invalid')).rows[0], { status: 'active', unsubscribe_token_hash: hash('e') });
  assert.equal((await db.query('select public.newsletter_unsubscribe($1) as result', [hash('e')])).rows[0].result, true);
});
test('confirming one pending request invalidates other older pending links', async () => {
  await request('multiple@example.invalid', '4', '5');
  await db.query("update public.newsletter_request_cooldowns set last_requested_at=now()-interval '2 minutes' where email=$1", ['multiple@example.invalid']);
  await request('multiple@example.invalid', '6', '7');
  assert.equal((await confirm('4')).rows[0].result, 'activated');
  assert.equal((await confirm('6')).rows[0].result, 'invalid');
  assert.equal((await subscriber('multiple@example.invalid')).rows[0].unsubscribe_token_hash, hash('5'));
});
test('address cooldown, expiry and validation fail closed', async () => {
  assert.equal((await request('other@example.invalid', '1')).rows[0].result, true);
  assert.equal((await request('OTHER@example.invalid', '2')).rows[0].result, false);
  await db.query("update public.newsletter_pending_confirmations set expires_at=now()-interval '1 second' where confirmation_hash=$1", [hash('1')]);
  assert.equal((await confirm('1')).rows[0].result, 'invalid');
  assert.equal((await subscriber('other@example.invalid')).rows.length, 0);
  await assert.rejects(request('not-an-email', '3'), e => e.code === '22023');
});
test.after(async () => db.close());
