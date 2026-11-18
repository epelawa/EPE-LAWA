import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create table public.private_enquiries(id uuid primary key, kind text, sender_name text, sender_email text, message text, created_at timestamptz default now());
create table public.test_auth(allowed boolean); insert into public.test_auth values (false);
create function public.staff_roles_authorized() returns boolean language sql as $$ select allowed from public.test_auth limit 1 $$;
create table public.test_audit(action text);
create function public.audit_event(text,text,text,uuid,text,jsonb) returns void language sql as $$ insert into public.test_audit values ($2) $$;`);
await db.exec(await readFile(new URL('../supabase/migrations/20261119014000_private_enquiry_staff.sql',import.meta.url),'utf8'));
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await db.query(`insert into public.private_enquiries(id,kind,sender_name,sender_email,message) values($1,'contact','Test','test@example.invalid','test message')`,[id]);
test('anonymous cannot execute and denied staff cannot list or resolve',async()=>{
 const r=await db.query(`select has_function_privilege('anon','public.staff_enquiry_list()','execute') a, has_function_privilege('authenticated','public.staff_enquiry_list()','execute') b`); assert.deepEqual(r.rows[0],{a:false,b:true});
 await assert.rejects(db.query('select * from public.staff_enquiry_list()'), e=>e.code==='42501');
 await assert.rejects(db.query('select public.staff_enquiry_resolve($1,1)',[id]), e=>e.code==='42501');
});
test('authorized read and state change are audited, stale revisions rejected',async()=>{
 await db.exec('update public.test_auth set allowed=true'); const r=await db.query('select * from public.staff_enquiry_list()'); assert.equal(r.rows[0].status,'open');
 await db.query('select public.staff_enquiry_resolve($1,1)',[id]);
 await assert.rejects(db.query('select public.staff_enquiry_resolve($1,1)',[id]), e=>e.code==='40001');
 assert.deepEqual((await db.query('select action from public.test_audit order by action')).rows.map(x=>x.action),['enquiry.list','enquiry.resolve']);
});
test.after(async()=>db.close());
