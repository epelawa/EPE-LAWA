import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create table public.stories(slug text,title text,summary text,body jsonb,author_name text,category_slug text,category_label text,published_at timestamptz,published boolean); create view public.published_articles as select slug,title,summary,body,author_name,category_slug,category_label,published_at from public.stories where published; grant select on public.published_articles to anon,authenticated; insert into public.stories values ('public','A headline','Summary','{"text":"Hidden treasure"}','Writer','community','Community','2026-11-01',true),('draft','Secret headline','Summary','{"text":"Hidden treasure"}','Writer','community','Community','2026-11-02',false);`);
await db.exec(await readFile(new URL('../supabase/migrations/20261119110000_published_news_search.sql',import.meta.url),'utf8'));
test('searches public body, authors and topics without exposing drafts',async()=>{await db.exec('set role anon');for(const query of ['treasure','Writer','Community','headline']) {const {rows}=await db.query('select slug from public.search_published_news($1,$2,0)',[query,'']);assert.deepEqual(rows,[{slug:'public'}]);}assert.equal((await db.query("select * from public.search_published_news('treasure','politics',0)")).rows.length,0);assert.equal((await db.query("select * from public.search_published_news('%','',0)")).rows.length,0);await db.exec('reset role');});
after(()=>db.close());
