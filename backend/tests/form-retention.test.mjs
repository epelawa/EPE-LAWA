import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create table public.newsletter_pending_confirmations(confirmation_hash text primary key, expires_at timestamptz not null);
create table public.newsletter_request_cooldowns(email text primary key, last_requested_at timestamptz not null);
create table public.form_rate_buckets(scope text, bucket timestamptz, fingerprint text, primary key(scope,bucket,fingerprint));`);
await db.exec(await readFile(new URL('../supabase/migrations/20261119013000_form_retention.sql', import.meta.url), 'utf8'));
test('retention is service-role-only', async () => {
 const r = await db.query(`select has_function_privilege('anon','public.purge_expired_form_data()','execute') anon, has_function_privilege('authenticated','public.purge_expired_form_data()','execute') auth, has_function_privilege('service_role','public.purge_expired_form_data()','execute') service`);
 assert.deepEqual(r.rows[0], {anon:false, auth:false, service:true});
});
test('only old temporary rows are removed, leaving recent and active rows', async () => {
 await db.exec(`insert into public.newsletter_pending_confirmations values ('old',now()-interval '2 days'),('expired_recently',now()-interval '1 hour'),('active',now()+interval '10 minutes');
 insert into public.newsletter_request_cooldowns values ('old',now()-interval '2 days'),('recent',now());
 insert into public.form_rate_buckets values ('newsletter',now()-interval '3 days','old'),('newsletter',now(),'recent');`);
 const r = await db.query('select * from public.purge_expired_form_data()');
 assert.deepEqual(r.rows[0], {pending_deleted:1, cooldowns_deleted:1, buckets_deleted:1});
 assert.deepEqual((await db.query('select confirmation_hash from public.newsletter_pending_confirmations order by confirmation_hash')).rows.map(x=>x.confirmation_hash), ['active','expired_recently']);
 assert.equal((await db.query('select * from public.newsletter_request_cooldowns')).rows.length,1);
 assert.equal((await db.query('select * from public.form_rate_buckets')).rows.length,1);
});
test('each call deletes at most 1000 rows of each type', async () => {
 await db.exec(`insert into public.newsletter_request_cooldowns select 'old-'||i, now()-interval '2 days' from generate_series(1,1002) i;`);
 const first = await db.query('select * from public.purge_expired_form_data()'); assert.equal(first.rows[0].cooldowns_deleted,1000);
 const second = await db.query('select * from public.purge_expired_form_data()'); assert.equal(second.rows[0].cooldowns_deleted,2);
});
test.after(async()=>db.close());
