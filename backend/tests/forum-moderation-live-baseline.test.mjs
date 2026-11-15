import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const moderator='11111111-1111-4111-8111-111111111111';
const reporter='22222222-2222-4222-8222-222222222222';
const stranger='33333333-3333-4333-8333-333333333333';

test('missing-table Production baseline restores a private, capability-checked report queue and audited resolution', async () => {
 const db=new PGlite();
 try {
  await db.exec(`
   create role anon; create role authenticated; create domain citext as text;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to anon,authenticated;
   create table public.profiles(user_id uuid primary key references auth.users(id));
   create table public.moderation_actions(id uuid primary key default gen_random_uuid(),moderator_id uuid,target_type text,target_id uuid,action text,reason text,created_at timestamptz default now());
   create table public.audit_events(action text,resource_id uuid);
   create function public.has_capability(text) returns boolean language sql stable security definer set search_path='' as $$select auth.uid()='${moderator}'::uuid and $1='moderation.review'$$;
   create function public.require_capability(text) returns void language plpgsql security definer set search_path='' as $$begin if not public.has_capability($1) then raise exception using errcode='42501',message='denied';end if;end$$;
   create function public.is_member_active() returns boolean language sql stable as $$select auth.uid() is not null$$;
   create function public.is_member_banned() returns boolean language sql stable as $$select false$$;
   create function public.audit_event(text,text,text,uuid,text,jsonb) returns void language sql security definer set search_path='' as $$insert into public.audit_events values($2,$4)$$;
   insert into auth.users values('${moderator}'),('${reporter}'),('${stranger}');
   insert into public.profiles select id from auth.users;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261115010000_forum_moderation_schema_repair.sql',import.meta.url),'utf8'));
  const cat=(await db.query("insert into public.forum_categories(slug,name) values('synthetic','Synthetic') returning id")).rows[0].id;
  const thread=(await db.query("insert into public.forum_threads(category_id,author_id,slug,title) values($1,$2,'synthetic-thread','Synthetic thread') returning id",[cat,reporter])).rows[0].id;
  const post=(await db.query("insert into public.forum_posts(thread_id,author_id,body) values($1,$2,'Synthetic test content') returning id",[thread,reporter])).rows[0].id;
  const report=(await db.query("insert into public.forum_reports(post_id,reporter_id,reason,note) values($1,$2,'spam','Synthetic report') returning id",[post,reporter])).rows[0].id;
  async function role(uid) {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);await db.exec(uid?'set role authenticated':'set role anon');}
  await role(null);await assert.rejects(db.query('select id from public.forum_reports'),/permission denied/);
  await role(stranger);assert.equal((await db.query('select id from public.forum_reports')).rows.length,0);
  await assert.rejects(db.query("select public.forum_report_resolve($1,'dismiss','Synthetic reason')",[report]),/denied/);
  await role(reporter);assert.equal((await db.query('select id from public.forum_reports')).rows.length,1);
  await assert.rejects(db.query("update public.forum_reports set state='dismissed' where id=$1",[report]),/permission denied/);
  await role(moderator);
  assert.equal((await db.query("select r.id,p.body,t.title from public.forum_reports r join public.forum_posts p on p.id=r.post_id join public.forum_threads t on t.id=p.thread_id where r.state='open' limit 200")).rows.length,1);
  await assert.rejects(db.query("select public.forum_report_resolve($1,null,'Synthetic reason')",[report]),/invalid_action/);
  await assert.rejects(db.query("select public.forum_report_resolve($1,'hide','x')",[report]),/reason_required/);
  await db.query("select public.forum_report_resolve($1,'hide','Synthetic moderation reason')",[report]);
  assert.equal((await db.query('select state from public.forum_reports where id=$1',[report])).rows[0].state,'actioned');
  assert.equal((await db.query('select state from public.forum_posts where id=$1',[post])).rows[0].state,'hidden');
  await assert.rejects(db.query("select public.forum_report_resolve($1,'dismiss','Synthetic reason')",[report]),/open_report_not_found/);
  await role(null);assert.equal((await db.query('select id from public.forum_posts')).rows.length,0);
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int as count from public.audit_events where action='forum.report.resolve'")).rows[0].count,1);
  assert.equal((await db.query('select count(*)::int as count from public.moderation_actions')).rows[0].count,1);
 } finally {await db.close();}
});
