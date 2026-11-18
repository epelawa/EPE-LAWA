import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',staff='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create table public.profiles(user_id uuid primary key);create table public.staff_profiles(user_id uuid primary key,is_active boolean,must_change_password boolean);create table public.member_bans(user_id uuid primary key);create table public.audit_events(actor_id uuid, action text, resource_id uuid);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create function public.is_member_active() returns boolean language sql as $$select exists(select 1 from public.profiles where user_id=auth.uid())$$;create function public.is_member_banned() returns boolean language sql security definer as $$select exists(select 1 from public.member_bans where user_id=auth.uid())$$;create function public.has_capability(text) returns boolean language sql as $$select auth.uid()='${staff}'::uuid$$;create function public.require_capability(text) returns void language plpgsql as $$begin if not public.has_capability('business.review') then raise exception using errcode='42501';end if;end$$;create function public.audit_event(text,text,text,uuid,text,jsonb) returns void language plpgsql as $$begin if current_setting('test.audit_fail',true)='true' then raise exception 'audit unavailable'; end if; insert into public.audit_events values (auth.uid(),$2,$4); end$$;insert into auth.users values ('${member}',now()),('${staff}',now());insert into profiles values ('${member}');insert into staff_profiles values ('${staff}',true,false);`);
await db.exec(await readFile(new URL('../supabase/reconciliation/business_discovery_candidate.sql',import.meta.url),'utf8'));
const category=(await db.query('select id from public.business_categories limit 1')).rows[0].id;
async function identity(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id??'']);await db.exec('set role '+role);}
test('private submission, authorization and atomic publication',async()=>{
 await identity(null,'anon');assert.equal((await db.query('select * from public.published_businesses')).rows.length,0);await assert.rejects(db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null)',['Shop',category]),e=>e.code==='42501');
 await identity(member);const id=(await db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null) id',['Shop',category])).rows[0].id;assert.equal((await db.query('select * from public.published_businesses')).rows.length,0);await assert.rejects(db.query("select public.business_review_decide($1,'published','valid reason','evidence exists')",[id]),e=>e.code==='42501');
 await identity(staff);assert.equal((await db.query('select id from public.businesses')).rows.length,1);await assert.rejects(db.query("select public.business_review_decide($1,'published','valid reason','short')",[id]),e=>e.code==='22023');await db.query("select public.business_review_decide($1,'published','valid reason','evidence exists')",[id]);
 await identity(null,'anon');const result=(await db.query('select name,is_verified from public.published_businesses')).rows;assert.deepEqual(result,[{name:'Shop',is_verified:true}]);assert.equal((await db.query("select * from public.business_discovery_search('Shop','','',0)")).rows.length,1);assert.equal((await db.query("select * from public.business_discovery_search('%','','',0)")).rows.length,0);await assert.rejects(db.query("update public.businesses set name='hacked'"),e=>e.code==='42501');
});
test('bans, staff password reset, and column permissions fail closed',async()=>{
 await db.exec(`reset role; insert into public.member_bans values ('${member}')`);await identity(member);
 await assert.rejects(db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null)', ['Shop',category]),e=>e.code==='42501');
 await assert.rejects(db.query('select owner_user_id from public.businesses'),e=>e.code==='42501');
 await db.exec(`reset role; delete from public.member_bans; update public.staff_profiles set must_change_password=true where user_id='${staff}'`);
 await identity(staff);assert.equal((await db.query("select id from public.businesses where status='submitted'")).rows.length,0);
 await assert.rejects(db.query("select public.business_review_decide($1,'published','valid reason','evidence exists')",['00000000-0000-4000-8000-000000000001']),e=>e.code==='42501');
 await db.exec(`reset role; update public.staff_profiles set must_change_password=false where user_id='${staff}'`);
 const events=await db.query("select action from public.audit_events order by action");
 assert.deepEqual(events.rows.map(x=>x.action),['business.review','business.submit']);
});
test('requires verified email and limits submissions per account',async()=>{
 await db.exec(`reset role; update auth.users set email_confirmed_at=null where id='${member}'`);await identity(member);
 await assert.rejects(db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null)',['Shop',category]),e=>e.code==='42501');
 await db.exec(`reset role; update auth.users set email_confirmed_at=now() where id='${member}'`);await identity(member);
 for(let i=0;i<4;i++)await db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null)',['Shop',category]);
 await assert.rejects(db.query('select public.business_submit($1,$2,null,null,null,null,null,null,null,null,null)',['Shop',category]),e=>e.code==='54000');
});
test('audit failure rolls back verification and publication',async()=>{
 await db.exec('reset role');const id=(await db.query("select id from public.businesses where status='submitted' limit 1")).rows[0].id;
 await identity(staff);await db.query("select set_config('test.audit_fail','true',false)");
 await assert.rejects(db.query("select public.business_review_decide($1,'published','valid reason','evidence exists')",[id]),/audit unavailable/);
 await db.exec('reset role');await db.query("select set_config('test.audit_fail','false',false)");
 assert.equal((await db.query('select status from public.businesses where id=$1',[id])).rows[0].status,'submitted');
 assert.equal((await db.query('select count(*)::int n from public.business_verifications where business_id=$1',[id])).rows[0].n,0);
});
after(()=>db.close());
