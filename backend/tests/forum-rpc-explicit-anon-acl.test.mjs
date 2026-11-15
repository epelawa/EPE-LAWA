import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('explicit anon grants from Supabase defaults are revoked while authenticated EXECUTE remains',async()=>{
 const db=new PGlite();try {
  await db.exec(`create role anon;create role authenticated;alter default privileges grant execute on functions to anon,authenticated;create function public.forum_post_moderate(uuid,text,text) returns void language sql as $$select$$;create function public.forum_report_resolve(uuid,text,text) returns void language sql as $$select$$;revoke all on function public.forum_post_moderate(uuid,text,text),public.forum_report_resolve(uuid,text,text) from public;`);
  const query="select has_function_privilege('anon',p.oid,'execute') as anon_execute,has_function_privilege('authenticated',p.oid,'execute') as auth_execute from pg_proc p where p.proname in ('forum_post_moderate','forum_report_resolve') limit 2";
  assert.ok((await db.query(query)).rows.every(r=>r.anon_execute));
  const sql=await readFile(new URL('../supabase/migrations/20261115010200_forum_rpc_explicit_anon_acl.sql',import.meta.url),'utf8');
  await db.exec(sql);assert.equal((await db.query(query)).rows.length,2);assert.ok((await db.query(query)).rows.every(r=>!r.anon_execute&&r.auth_execute));
  await db.exec(sql);assert.ok((await db.query(query)).rows.every(r=>!r.anon_execute&&r.auth_execute));
 }finally{await db.close();}
});
