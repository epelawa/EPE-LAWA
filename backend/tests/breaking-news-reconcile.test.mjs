import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const published = '00000000-0000-4000-8000-000000000001';
const draft = '00000000-0000-4000-8000-000000000002';
await db.exec(`
  create role anon; create role authenticated;
  create table public.articles(id uuid primary key, revision bigint not null, published_version_id uuid, is_breaking boolean not null default false, breaking_until timestamptz);
  create table public.audit_log(action text, metadata jsonb);
  create function public.require_capability(capability text) returns void language plpgsql as $$ begin
    if current_setting('test.can_publish', true) is distinct from 'yes' then raise exception using errcode='42501', message='denied'; end if;
  end $$;
  create function public.audit_event(actor_kind text, action text, resource_type text, resource_id uuid, outcome text, metadata jsonb) returns void language plpgsql as $$ begin insert into public.audit_log values (action, metadata); end $$;
  insert into public.articles(id,revision,published_version_id) values ('${published}',1,'00000000-0000-4000-8000-000000000003'), ('${draft}',1,null);
`);
const sql = await readFile(new URL('../supabase/migrations/20261118060000_restore_article_set_breaking.sql', import.meta.url), 'utf8');
await db.exec(sql); await db.exec(sql);
const setBreaking = (id, flag, until, revision) => db.query('select public.article_set_breaking($1,$2,$3,$4)', [id, flag, until, revision]);
const future = new Date(Date.now() + 3600000).toISOString();

test('explicit grants and capability check deny anonymous and unauthorized callers', async () => {
  const grants = (await db.query("select has_function_privilege('anon','public.article_set_breaking(uuid,boolean,timestamptz,bigint)','execute') anon, has_function_privilege('authenticated','public.article_set_breaking(uuid,boolean,timestamptz,bigint)','execute') auth")).rows[0];
  assert.deepEqual(grants, { anon: false, auth: true });
  await db.exec('set role anon');
  await assert.rejects(setBreaking(published, true, future, 1), e => e.code === '42501');
  await db.exec('reset role; set role authenticated');
  await assert.rejects(setBreaking(published, true, future, 1), e => e.code === '42501');
  await db.exec("reset role; set test.can_publish = 'yes'; set role authenticated");
});
test('only a published article, valid flag and future finite expiry with exact revision are accepted', async () => {
  await assert.rejects(setBreaking(draft, true, future, 1), e => e.code === '42501');
  for (const revision of [null, 2]) await assert.rejects(setBreaking(published, true, future, revision), e => e.code === '40001');
  for (const until of [null, '2000-01-01T00:00:00Z', 'infinity']) await assert.rejects(setBreaking(published, true, until, 1), e => e.code === '22023');
  await assert.rejects(setBreaking(published, null, future, 1), e => e.code === '22023');
  await setBreaking(published, true, future, 1);
  await db.exec('reset role');
  const row = (await db.query('select is_breaking, revision, breaking_until from public.articles where id=$1', [published])).rows[0];
  assert.equal(row.is_breaking, true); assert.equal(Number(row.revision), 2); assert.ok(row.breaking_until);
  assert.equal((await db.query('select count(*)::int as n from public.audit_log')).rows[0].n, 1);
  await db.exec('set role authenticated');
  await assert.rejects(setBreaking(published, false, null, 1), e => e.code === '40001');
  await setBreaking(published, false, null, 2);
  await db.exec('reset role');
  const cleared = (await db.query('select is_breaking,revision,breaking_until from public.articles where id=$1', [published])).rows[0];
  assert.equal(cleared.is_breaking, false); assert.equal(Number(cleared.revision), 3); assert.equal(cleared.breaking_until, null);
  assert.equal((await db.query('select count(*)::int as n from public.audit_log')).rows[0].n, 2);
});
test('multiple published stories can be breaking at the same time', async () => {
 const second='00000000-0000-4000-8000-000000000004';
 await db.query("insert into public.articles(id,revision,published_version_id) values ($1,1,$2)",[second,published]);
 await db.exec('set role authenticated');
 await setBreaking(published,true,future,3); await setBreaking(second,true,future,1);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from public.articles where is_breaking=true')).rows[0].n,2);
});
test.after(() => db.close());
