import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  '20261114141000_radio_publication_state_reconcile.sql',
);
const migration = await readFile(migrationPath, 'utf8');
const db = new PGlite();
const staffId = '11111111-1111-4111-8111-111111111111';
const unverifiedId = '55555555-5555-4555-8555-555555555555';
const programmeId = '22222222-2222-4222-8222-222222222222';
const episodeId = '33333333-3333-4333-8333-333333333333';
const scheduleId = '44444444-4444-4444-8444-444444444444';

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create table public.capabilities (key text primary key, description text not null);
  insert into public.capabilities (key, description) values
    ('admin.access', 'Admin access'),
    ('article.create', 'Create articles'),
    ('article.publish', 'Publish articles'),
    ('article.review', 'Review articles'),
    ('article.unpublish', 'Unpublish articles'),
    ('audit.read', 'Read audit'),
    ('business.review', 'Review businesses'),
    ('moderation.review', 'Review moderation'),
    ('order.manage', 'Manage orders'),
    ('people.manage', 'Manage people'),
    ('radio.manage', 'Manage radio'),
    ('staff.manage', 'Manage staff');

  create table public.staff_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    is_active boolean not null default false,
    created_at timestamptz not null default now()
  );
  create table public.staff_capability_grants (
    user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
    capability text not null references public.capabilities(key),
    granted_at timestamptz not null default now(),
    granted_by uuid references auth.users(id) on delete set null,
    revoked_at timestamptz,
    primary key (user_id, capability)
  );
  alter table public.staff_profiles enable row level security;
  alter table public.staff_capability_grants enable row level security;
  revoke all on public.staff_profiles, public.staff_capability_grants from public, anon, authenticated;
  grant select on public.staff_profiles, public.staff_capability_grants to authenticated;
  create policy staff_read_own_profile on public.staff_profiles
    for select to authenticated using ((select auth.uid()) = user_id);
  create policy staff_read_own_active_capability on public.staff_capability_grants
    for select to authenticated using ((select auth.uid()) = user_id);

  create table public.programmes (
    id uuid primary key,
    is_active boolean not null default true
  );
  create table public.episodes (
    id uuid primary key,
    programme_id uuid references public.programmes(id),
    published_at timestamptz
  );
  create table public.radio_schedule (
    id uuid primary key,
    programme_id uuid references public.programmes(id)
  );
  alter table public.programmes enable row level security;
  alter table public.episodes enable row level security;
  alter table public.radio_schedule enable row level security;
  grant select on public.programmes, public.episodes, public.radio_schedule to anon, authenticated;
  grant insert, update, delete on public.programmes, public.episodes, public.radio_schedule to authenticated;
  create policy programmes_read on public.programmes
    for select to anon, authenticated using (is_active);
  create policy episodes_read on public.episodes
    for select to anon, authenticated using (published_at is not null);
  create policy radio_schedule_read on public.radio_schedule
    for select to anon, authenticated using (true);

  create table public.audit_events (
    actor_id uuid,
    actor_kind text,
    action text,
    resource_type text,
    resource_id uuid,
    outcome text,
    metadata jsonb
  );
  create function public.audit_event(
    p_actor_kind text, p_action text, p_resource_type text, p_resource_id uuid,
    p_outcome text, p_metadata jsonb default '{}'::jsonb, p_request_id text default null
  ) returns void language plpgsql security definer set search_path = '' as $$
  begin
    insert into public.audit_events(actor_id, actor_kind, action, resource_type, resource_id, outcome, metadata)
    values (auth.uid(), p_actor_kind, p_action, p_resource_type, p_resource_id, p_outcome, coalesce(p_metadata, '{}'::jsonb));
  end;
  $$;
  -- Match the live legacy function signature/body shape; the reconciliation replaces it.
  create function public.require_capability(capability text)
    returns void language plpgsql as $$ begin return; end $$;

  insert into auth.users (id, email, email_confirmed_at)
    values ('${staffId}', 'radio-staff@example.invalid', now());
  insert into public.staff_profiles(user_id, is_active) values ('${staffId}', true);
  insert into public.staff_capability_grants(user_id, capability)
    values ('${staffId}', 'radio.manage');
  insert into auth.users (id, email, email_confirmed_at)
    values ('${unverifiedId}', 'unverified@example.invalid', null);
  insert into public.staff_profiles(user_id, is_active) values ('${unverifiedId}', true);
  insert into public.staff_capability_grants(user_id, capability)
    values ('${unverifiedId}', 'article.publish');

  insert into public.programmes(id, is_active) values ('${programmeId}', true);
  insert into public.episodes(id, programme_id, published_at)
    values ('${episodeId}', '${programmeId}', now());
  insert into public.radio_schedule(id, programme_id)
    values ('${scheduleId}', '${programmeId}');
`);

async function as(role, userId, fn) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const countAs = async (role, userId, table) => as(role, userId, async () => {
  const result = await db.query(`select count(*)::int as count from public.${table}`);
  return result.rows[0].count;
});

after(async () => db.close());

test('adds radio status and helper functions without dropping existing rows', async () => {
  await db.exec(migration);
  const programmes = (await db.query(
    'select id, publication_status from public.programmes order by id',
  )).rows;
  const episodes = (await db.query(
    'select id, publication_status from public.episodes order by id',
  )).rows;
  const schedules = (await db.query(
    'select id, publication_status from public.radio_schedule order by id',
  )).rows;
  assert.deepEqual(programmes, [{ id: programmeId, publication_status: 'draft' }]);
  assert.deepEqual(episodes, [{ id: episodeId, publication_status: 'draft' }]);
  assert.deepEqual(schedules, [{ id: scheduleId, publication_status: 'draft' }]);
  assert.equal((await db.query("select public.has_capability('radio.manage') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select count(*)::int as n from pg_proc where proname='has_capability' and pronamespace='public'::regnamespace")).rows[0].n, 1);
});

test('unverified active staff cannot use any granted capability', async () => {
  const capability = await as('authenticated', unverifiedId, () =>
    db.query("select public.has_capability('article.publish') as allowed"),
  );
  const active = await as('authenticated', unverifiedId, () =>
    db.query('select public.current_staff_is_active() as active'),
  );
  assert.equal(capability.rows[0].allowed, false);
  assert.equal(active.rows[0].active, false);
  await assert.rejects(
    as('authenticated', unverifiedId, () => db.query("select public.require_capability('article.publish')")),
    /capability_required/,
  );
});

test('draft radio records stay private while active radio staff can see them', async () => {
  assert.equal(await countAs('anon', null, 'programmes'), 0);
  assert.equal(await countAs('anon', null, 'episodes'), 0);
  assert.equal(await countAs('anon', null, 'radio_schedule'), 0);
  assert.equal(await countAs('authenticated', '55555555-5555-4555-8555-555555555555', 'programmes'), 0);
  assert.equal(await countAs('authenticated', staffId, 'programmes'), 1);
  assert.equal(await countAs('authenticated', staffId, 'episodes'), 1);
  assert.equal(await countAs('authenticated', staffId, 'radio_schedule'), 1);

  const episodePolicies = (await db.query(
    "select policyname, qual from pg_policies where schemaname='public' and tablename='episodes' order by policyname",
  )).rows;
  assert.equal(episodePolicies.some((policy) => policy.policyname === 'episodes_read_public'), false);
  assert.match(episodePolicies.find((policy) => policy.policyname === 'episodes_read').qual, /publication_status/);
});

test('published programme, episode and schedule become public; invalid status is rejected; rerun is safe', async () => {
  await db.query('select set_config(\'request.jwt.claim.sub\', $1, false)', [staffId]);
  await db.query("update public.programmes set publication_status='published' where id=$1", [programmeId]);
  await db.query("update public.episodes set publication_status='published' where id=$1", [episodeId]);
  await db.query("update public.radio_schedule set publication_status='published' where id=$1", [scheduleId]);
  assert.equal(await countAs('anon', null, 'programmes'), 1);
  assert.equal(await countAs('anon', null, 'episodes'), 1);
  assert.equal(await countAs('anon', null, 'radio_schedule'), 1);
  await assert.rejects(
    db.query("update public.programmes set publication_status='invalid' where id=$1", [programmeId]),
    /programmes_publication_status/,
  );

  await db.exec(migration);
  assert.equal((await db.query("select count(*)::int as n from public.programmes where publication_status='published'")).rows[0].n, 1);
  assert.equal((await db.query("select count(*)::int as n from public.audit_events where action like 'radio.catalogue_%'")).rows[0].n, 3);
});
