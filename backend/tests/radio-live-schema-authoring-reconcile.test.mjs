import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const migrationPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations', '20261115010500_radio_live_schema_authoring_reconcile.sql');
const migration = await readFile(migrationPath, 'utf8');
const db = new PGlite();
const staff = '11111111-1111-4111-8111-111111111111';
const prog = '22222222-2222-4222-8222-222222222222';
const episode = '33333333-3333-4333-8333-333333333333';
const slot = '44444444-4444-4444-8444-444444444444';
await db.exec(`
 create role anon nologin; create role authenticated nologin; create schema auth;
 create domain public.citext as text;
 create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table public.staff_profiles(user_id uuid primary key, is_active boolean not null);
 create table public.staff_capability_grants(user_id uuid, capability text, revoked_at timestamptz);
 create function public.require_capability(p_capability text) returns void language plpgsql as $$ begin if auth.uid() is null then raise exception using errcode='42501', message='denied'; end if; end $$;
 create function public.audit_event(text,text,text,uuid,text,jsonb default '{}'::jsonb,text default null) returns void language plpgsql as $$ begin return; end $$;
 create table public.radio_rights_records(id uuid primary key default gen_random_uuid(), resource_type text, resource_id uuid, note text, recorded_by uuid);
 create table public.programmes(id uuid primary key default gen_random_uuid(), slug citext not null unique, name text not null, description text, schedule_note text, is_active boolean not null default true, publication_status text not null default 'draft');
 create table public.episodes(id uuid primary key default gen_random_uuid(), programme_id uuid not null references public.programmes(id), slug citext not null unique, title text not null, description text, aired_on date, duration_seconds integer, media_asset_id uuid, external_url text, published_at timestamptz, publication_status text not null default 'draft');
 create table public.radio_schedule(id uuid primary key default gen_random_uuid(), programme_id uuid references public.programmes(id), day_of_week smallint, starts_at time, ends_at time, note text, publication_status text not null default 'draft');
 insert into auth.users values ('${staff}', now()); insert into public.staff_profiles values ('${staff}',true); insert into public.staff_capability_grants values ('${staff}','radio.manage',null);
 insert into public.programmes(id,slug,name,publication_status) values ('${prog}','old-show','Old Show','published');
 insert into public.episodes(id,programme_id,slug,title,publication_status) values ('${episode}','${prog}','old-episode','Old Episode','draft');
 insert into public.radio_schedule(id,programme_id,day_of_week,starts_at,ends_at,publication_status) values ('${slot}','${prog}',1,'09:00','10:00','published');
`);
after(async () => db.close());

test('adds missing read fields without losing existing live rows/statuses; supports all admin query shapes', async () => {
 await db.exec(migration);
 const p = (await db.query('select id,name,description,publication_status,revision from public.programmes order by updated_at desc limit 100')).rows;
 const e = (await db.query('select id,programme_id,title,slug,description,aired_on,external_url,publication_status,published_at,revision from public.episodes order by updated_at desc limit 100')).rows;
 const s = (await db.query('select id,programme_id,day_of_week,starts_at,ends_at,note,publication_status,revision from public.radio_schedule order by day_of_week,starts_at limit 200')).rows;
 assert.equal(p[0].name,'Old Show'); assert.equal(p[0].publication_status,'published'); assert.equal(p[0].revision,1);
 assert.equal(e[0].title,'Old Episode'); assert.equal(e[0].revision,1);
 assert.equal(s[0].publication_status,'published'); assert.equal(s[0].revision,1);
});

test('atomic authoring preserves private rights evidence and rejects stale revisions', async () => {
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[staff]);
 const inserted = await db.query("select * from public.radio_authoring_save('programme',null,null,$1::jsonb,'Rights provenance')",[JSON.stringify({slug:'new-show',name:'New Show',description:null,publication_status:'draft'})]);
 assert.equal(inserted.rows[0].new_revision,1);
 assert.equal((await db.query("select note from public.radio_rights_records where resource_id=$1",[inserted.rows[0].resource_id])).rows[0].note,'Rights provenance');
 await assert.rejects(db.query("select * from public.radio_authoring_save('programme',$1,99,$2::jsonb,null)",[prog,JSON.stringify({slug:'old-show',name:'Changed',publication_status:'draft'})]),/radio_revision_conflict/);
 const revised=await db.query("select * from public.radio_authoring_save('programme',$1,1,$2::jsonb,null)",[prog,JSON.stringify({slug:'old-show',name:'Changed',publication_status:'draft'})]);
 assert.equal(revised.rows[0].new_revision,2);
 const savedSchedule=await db.query("select * from public.radio_authoring_save('schedule',null,null,$1::jsonb,null)",[JSON.stringify({programme_id:prog,day_of_week:2,starts_at:'11:00',ends_at:'12:00',note:null,publication_status:'draft'})]);
 assert.equal(savedSchedule.rows[0].new_revision,1);
 const savedEpisode=await db.query("select * from public.radio_authoring_save('episode',null,null,$1::jsonb,'Approved source evidence')",[JSON.stringify({programme_id:prog,slug:'new-episode',title:'New Episode',description:null,aired_on:null,external_url:'https://media.example.invalid/episode.mp3',publication_status:'published'})]);
 assert.equal(savedEpisode.rows[0].new_revision,1);
 assert.equal((await db.query('select publication_status from public.episodes where id=$1',[savedEpisode.rows[0].resource_id])).rows[0].publication_status,'published');
});

test('migration is safe to rerun and exposes no destructive SQL', async () => {
 assert.doesNotMatch(migration,/\b(drop\s+table|truncate|delete\s+from|call\s+)/i);
 await db.exec(migration);
 assert.equal((await db.query('select count(*)::int n from public.programmes')).rows[0].n,2);
});
