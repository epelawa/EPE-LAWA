import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const migration = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations', '20261115011000_newsroom_reference_settings.sql');
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create domain citext as text;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table public.categories (id uuid primary key, slug citext unique not null, label text not null, description text, sort_order integer not null, is_active boolean not null);
  create table public.authors (id uuid primary key, staff_user_id uuid, display_name text not null, slug citext unique not null, bio text, photo_key text, created_at timestamptz not null default now());
  create table public.audit_events (id bigint generated always as identity primary key, actor_id uuid, actor_kind text, action text, resource_type text, resource_id uuid, outcome text, metadata jsonb);
  create table public.capabilities (user_id uuid, capability text, primary key(user_id, capability));
  create function public.require_capability(p_capability text) returns void language plpgsql security definer set search_path = '' as $$ begin if not exists(select 1 from public.capabilities c where c.user_id = auth.uid() and c.capability = p_capability) then raise exception using errcode='42501', message='capability_required'; end if; end $$;
  create function public.audit_event(p_actor_kind text,p_action text,p_resource_type text,p_resource_id uuid,p_outcome text,p_metadata jsonb default '{}'::jsonb,p_request_id text default null) returns void language sql security definer set search_path = '' as $$ insert into public.audit_events(actor_id,actor_kind,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),p_actor_kind,p_action,p_resource_type,p_resource_id,p_outcome,p_metadata) $$;
`);
await db.exec(await readFile(migration, 'utf8'));
const editor = '11111111-1111-4111-8111-111111111111';
const ref = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await db.query("insert into public.capabilities values ($1, 'article.publish')", [editor]);
async function asUser(uid, fn) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  try { return await fn(); } finally { await db.query("select set_config('request.jwt.claim.sub', '', false)"); }
}
async function sqlFails(sql, params = []) {
  try { await db.query(sql, params); return null; } catch (error) { return error; }
}
test('production-shaped category and author columns support only audited additive create/edit operations', async () => {
  assert.deepEqual((await db.query("select column_name from information_schema.columns where table_name='categories' order by ordinal_position")).rows.map(x => x.column_name), ['id','slug','label','description','sort_order','is_active']);
  const category = await asUser(editor, () => db.query('select public.newsroom_category_save(null,$1,$2,$3,$4,$5) as id', ['community-news','Community News',null,10,true]));
  const byline = await asUser(editor, () => db.query('select public.newsroom_byline_save(null,$1,$2,$3,$4) as id', ['a-oyedele','A. Oyedele',null,null]));
  const categoryId = category.rows[0].id;
  const bylineId = byline.rows[0].id;
  await asUser(editor, () => db.query('select public.newsroom_category_save($1,$2,$3,$4,$5,$6)', [categoryId,'community','Community',null,20,false]));
  await asUser(editor, () => db.query('select public.newsroom_byline_save($1,$2,$3,$4,$5)', [bylineId,'a-oyedele','Ayo Oyedele','Editor',null]));
  assert.deepEqual((await db.query('select slug,label,is_active from public.categories where id=$1', [categoryId])).rows[0], { slug: 'community', label: 'Community', is_active: false });
  assert.equal((await db.query('select display_name,bio from public.authors where id=$1', [bylineId])).rows[0].display_name, 'Ayo Oyedele');
  assert.equal((await db.query('select count(*)::int as n from public.audit_events')).rows[0].n, 4);
  assert.deepEqual((await db.query('select action from public.audit_events order by id')).rows.map(x => x.action), ['newsroom.category_create','newsroom.byline_create','newsroom.category_update','newsroom.byline_update']);
  assert.equal((await db.query("select count(*)::int as n from public.audit_events where metadata::text ilike '%Oyedele%' or metadata::text ilike '%Community%'" )).rows[0].n, 0);
});
test('RPCs reject unauthorized users, malformed slugs, slug conflicts and nonexistent edits', async () => {
  const denied = await asUser('22222222-2222-4222-8222-222222222222', () => sqlFails("select public.newsroom_category_save(null,'news','News',null,0,true)"));
  assert.equal(denied.code, '42501');
  const invalid = await asUser(editor, () => sqlFails("select public.newsroom_category_save(null,'Bad Slug','Bad',null,0,true)"));
  assert.equal(invalid.code, '22023');
  await asUser(editor, () => db.query("select public.newsroom_category_save(null,'news','News',null,0,true)"));
  const conflict = await asUser(editor, () => sqlFails("select public.newsroom_category_save(null,'NEWS','Duplicate',null,0,true)"));
  assert.equal(conflict.code, '23505');
  const missing = await asUser(editor, () => sqlFails("select public.newsroom_byline_save($1,'ghost','Ghost',null,null)", ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']));
  assert.equal(missing.code, 'P0002');
  assert.equal((await db.query('select count(*)::int as n from public.authors')).rows[0].n, 1, 'failed edit did not create or delete bylines');
});
test('RPC execute privileges are not granted to PUBLIC or anon', async () => {
  const results = (await db.query(`select p.proname, has_function_privilege('public',p.oid,'execute') as public_exec, has_function_privilege('anon',p.oid,'execute') as anon_exec, has_function_privilege('authenticated',p.oid,'execute') as auth_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('newsroom_category_save','newsroom_byline_save')`)).rows;
  assert.equal(results.length, 2);
  for (const row of results) { assert.equal(row.public_exec, false); assert.equal(row.anon_exec, false); assert.equal(row.auth_exec, true); }
});
test.after(async () => db.close());
