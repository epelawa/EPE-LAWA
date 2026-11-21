import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
await db.exec(await readFile(new URL('../supabase/migrations/20261119012000_form_rate_limits.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261122010000_form_rate_scope_widen.sql',import.meta.url),'utf8'));
const check = async (scope, key, limit) => (await db.query(limit ? 'select public.form_rate_limit($1,$2,$3) allowed' : 'select public.form_rate_limit($1,$2) allowed', limit ? [scope,key,limit] : [scope,key])).rows[0].allowed;
const FINGERPRINT = 'a'.repeat(64);
test('client roles cannot invoke or inspect limits', async () => {
 const r = await db.query(`select has_function_privilege('anon','public.form_rate_limit(text,text,integer,integer)','execute') anon_exec, has_table_privilege('authenticated','public.form_rate_buckets','select') auth_read, has_function_privilege('service_role','public.form_rate_limit(text,text,integer,integer)','execute') service_exec`);
 assert.deepEqual(r.rows[0], { anon_exec:false, auth_read:false, service_exec:true });
});
test('validates input, enforces client budget and separates scopes', async () => {
 assert.equal(await check('newsletter','bad'),false); assert.equal(await check('bad',FINGERPRINT),false);
 for(let i=0;i<5;i++) assert.equal(await check('newsletter',FINGERPRINT),true);
 assert.equal(await check('newsletter',FINGERPRINT),false); assert.equal(await check('enquiry',FINGERPRINT),true);
});
test('enforces the scope-wide hourly budget', async () => {
 for(let i=0;i<95;i++) assert.equal(await check('newsletter',i.toString(16).padStart(64,'0')),true);
 assert.equal(await check('newsletter','f'.repeat(64)),false);
});
test('accepts the widened form scopes and per-call budgets', async () => {
 for (const scope of ['auth_signup','auth_signin','auth_reset','auth_otp','auth_resend','business_submit','tourism_submit','gallery_submit','history_submit','forum_post']) {
  const key = scope.split('').map((c)=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').padEnd(64,'0');
  assert.equal(await check(scope,key),true,scope);
 }
 assert.equal(await check('auth_otp','0'.repeat(64),2),true);
 assert.equal(await check('auth_otp','0'.repeat(64),2),true);
 assert.equal(await check('auth_otp','0'.repeat(64),2),false);
});
test.after(async()=>db.close());
