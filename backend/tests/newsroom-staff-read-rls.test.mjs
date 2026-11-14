import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', 'supabase', 'migrations', '20261115004000_newsroom_staff_read_rls.sql',
);
const db = new PGlite();
const uid = {
  author: '11111111-1111-4111-8111-111111111111',
  otherAuthor: '22222222-2222-4222-8222-222222222222',
  reviewer: '33333333-3333-4333-8333-333333333333',
  publisher: '44444444-4444-4444-8444-444444444444',
  member: '55555555-5555-4555-8555-555555555555',
};

// This isolated fixture is intentionally synthetic and contains no project/user content.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table public.staff_capability_grants (
    user_id uuid not null, capability text not null,
    primary key (user_id, capability)
  );
  create function public.has_capability(p_capability text) returns boolean
    language sql stable security definer set search_path = '' as $$
      select exists (
        select 1 from public.staff_capability_grants g
        where g.user_id = auth.uid() and g.capability = p_capability
      )
    $$;
  create table public.articles (
    id uuid primary key, owner_id uuid not null, published_version_id uuid
  );
  create table public.article_versions (
    id uuid primary key, article_id uuid not null references public.articles(id), state text not null
  );
  alter table public.articles enable row level security;
  alter table public.article_versions enable row level security;

  -- Exact verified Production baseline policies: do not preserve any local/history policies here.
  create policy articles_read_published on public.articles
    for select to anon, authenticated using (published_version_id is not null);
  create policy article_versions_read_published on public.article_versions
    for select to anon, authenticated using (state = 'approved');

  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant execute on function public.has_capability(text) to anon, authenticated;
  grant select on public.articles, public.article_versions to anon, authenticated;
`);
await db.exec(await readFile(migrationPath, 'utf8'));

const ids = {
  article: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  version1: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  version2: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  unapproved: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};
await db.query('insert into public.staff_capability_grants values ($1, $2), ($3, $4), ($5, $6)', [
  uid.author, 'article.create', uid.reviewer, 'article.review', uid.publisher, 'article.publish',
]);
await db.query('insert into public.articles (id, owner_id, published_version_id) values ($1, $2, null)', [ids.article, uid.author]);
await db.query('insert into public.article_versions (id, article_id, state) values ($1, $2, $3), ($4, $2, $5), ($6, $2, $7)', [
  ids.version1, ids.article, 'approved', ids.version2, 'approved', ids.unapproved, 'review',
]);

async function as(role, userId, fn) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
async function articleIds(role, userId) {
  return as(role, userId, async () => (await db.query('select id from public.articles order by id')).rows.map((r) => r.id));
}
async function versionIds(role, userId) {
  return as(role, userId, async () => (await db.query('select id from public.article_versions order by id')).rows.map((r) => r.id));
}

test('Production-baseline RLS plus newsroom migration scopes private reads and public versions to current approved pointer', async () => {
  assert.deepEqual(await articleIds('authenticated', uid.author), [ids.article], 'owner with article.create can read private article');
  assert.deepEqual(await versionIds('authenticated', uid.author), [ids.version1, ids.version2, ids.unapproved], 'owner can read own private versions');
  assert.deepEqual(await articleIds('authenticated', uid.otherAuthor), [], 'unrelated author cannot read private article');
  assert.deepEqual(await versionIds('authenticated', uid.otherAuthor), [], 'unrelated author cannot read private versions');
  assert.deepEqual(await articleIds('authenticated', uid.reviewer), [ids.article], 'reviewer can read private article');
  assert.deepEqual(await versionIds('authenticated', uid.reviewer), [ids.version1, ids.version2, ids.unapproved], 'reviewer can read newsroom versions');
  assert.deepEqual(await articleIds('authenticated', uid.publisher), [ids.article], 'publisher can read private article');
  assert.deepEqual(await versionIds('authenticated', uid.publisher), [ids.version1, ids.version2, ids.unapproved], 'publisher can read newsroom versions');
  assert.deepEqual(await articleIds('authenticated', uid.member), [], 'ordinary member cannot read unpublished article');
  assert.deepEqual(await versionIds('authenticated', uid.member), [], 'ordinary member cannot read unpublished versions');
  assert.deepEqual(await articleIds('anon', null), [], 'anon cannot read unpublished article');
  assert.deepEqual(await versionIds('anon', null), [], 'anon cannot read unpublished versions');

  await db.query('update public.articles set published_version_id = $2 where id = $1', [ids.article, ids.version1]);
  assert.deepEqual(await versionIds('anon', null), [ids.version1], 'public sees exactly the approved current pointer');
  assert.deepEqual(await versionIds('authenticated', uid.member), [ids.version1], 'ordinary member sees exactly the approved current pointer');

  await db.query('update public.articles set published_version_id = $2 where id = $1', [ids.article, ids.version2]);
  assert.deepEqual(await versionIds('anon', null), [ids.version2], 'previous approved snapshot is hidden after pointer moves');
  assert.deepEqual(await versionIds('authenticated', uid.member), [ids.version2], 'member cannot read previous approved snapshot');

  await db.query('update public.articles set published_version_id = null where id = $1', [ids.article]);
  assert.deepEqual(await articleIds('anon', null), [], 'unpublish immediately hides article');
  assert.deepEqual(await articleIds('authenticated', uid.member), [], 'unpublish hides article from member');
  assert.deepEqual(await versionIds('anon', null), [], 'unpublish immediately hides approved version');
  assert.deepEqual(await versionIds('authenticated', uid.member), [], 'unpublish hides approved version from member');
});

test.after(async () => db.close());
