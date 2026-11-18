import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
await db.exec(await readFile(new URL('../supabase/migrations/20261119012000_form_rate_limits.sql',import.meta.url),'utf8'));
const check = async (scope, key) => (await db.query('select public.form_rate_limit($1,$2) allowed',[scope,key])).rows[0].allowed;
test('client roles cannot invoke or inspect limits', async () => {
 const r = await db.query(`select has_function_privilege('anon','public.form_rate_limit(text,text)','execute') anon_exec, has_table_privilege('authenticated','public.form_rate_buckets','select') auth_read, has_function_privilege('service_role','public.form_rate_limit(text,text)','execute') service_exec`);
 assert.deepEqual(r.rows[0], { anon_exec:false, auth_read:false, service_exec:true });
});
test('validates input, enforces client budget and separates scopes', async () => {
 assert.equal(await check('newsletter','bad'),false); assert.equal(await check('bad','a'.repeat(64)),false);
 for(let i=0;i<5;i++) assert.equal(await check('newsletter','a'.repeat(64)),true);
 assert.equal(await check('newsletter','a'.repeat(64)),false); assert.equal(await check('enquiry','a'.repeat(64)),true);
});
test('enforces the scope-wide hourly budget', async () => {
 for(let i=0;i<95;i++) assert.equal(await check('newsletter',i.toString(16).padStart(64,'0')),true);
 assert.equal(await check('newsletter','f'.repeat(64)),false);
});
test.after(async()=>db.close());
