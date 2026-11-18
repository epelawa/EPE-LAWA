import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261118030000_newsletter_subscriptions.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261118053000_pause_unsafe_newsletter_signup.sql', import.meta.url), 'utf8'));

test('public roles cannot call unsafe signup and unsubscribe remains available', async () => {
  const rows = (await db.query(`select p.proname, has_function_privilege('anon',p.oid,'execute') anon_exec, has_function_privilege('authenticated',p.oid,'execute') auth_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('newsletter_subscribe_request','newsletter_unsubscribe') order by p.proname`)).rows;
  assert.deepEqual(rows, [{ proname: 'newsletter_subscribe_request', anon_exec: false, auth_exec: false }, { proname: 'newsletter_unsubscribe', anon_exec: true, auth_exec: true }]);
  await db.exec('set role anon');
  await assert.rejects(db.query("select public.newsletter_subscribe_request('synthetic@example.invalid', $1, $2, now() + interval '15 minutes')", ['a'.repeat(64), 'b'.repeat(64)]), error => error.code === '42501');
  await db.exec('reset role');
});
test('an existing token can still unsubscribe without changing or deleting the record', async () => {
  // Synthetic address and tokens only; no production records are touched.
  await db.query(`insert into public.newsletter_subscribers (email,status,unsubscribe_token_hash,management_otp_hash,otp_expires_at)
    values ($1, 'active', $2, $3, now() + interval '15 minutes')`, ['reader@example.invalid', 'c'.repeat(64), 'd'.repeat(64)]);
  await db.exec('set role anon');
  const result = await db.query('select public.newsletter_unsubscribe($1) as removed', ['c'.repeat(64)]);
  assert.equal(result.rows[0].removed, true);
  await db.exec('reset role');
  assert.equal((await db.query('select status from public.newsletter_subscribers')).rows[0].status, 'unsubscribed');
});
test.after(async () => db.close());
