import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("article creation saves unique tags atomically and preserves the creation capability", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create table public.articles (id uuid primary key, current_version_id uuid not null);
      create table public.tags (id uuid primary key default gen_random_uuid(), label text, slug text unique);
      create table public.article_version_tags (version_id uuid, tag_id uuid, primary key (version_id, tag_id));
      create function public.slugify(text) returns text language sql as
        $$ select nullif(regexp_replace(lower($1), '[^a-z0-9]+', '', 'g'), '') $$;
      create function public.require_capability(text) returns void language plpgsql as
        $$ begin if $1 <> 'article.create' or current_setting('test.can_create', true) <> 'yes' then
          raise exception using errcode = '42501'; end if; end; $$;
      create function public.audit_event(text,text,text,uuid,text,jsonb) returns void language sql as $$ select $$;
      create function public.article_create_with_cover(text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text)
      returns uuid language sql as
        $$ insert into public.articles values (gen_random_uuid(), gen_random_uuid()) returning id $$;
      insert into public.tags (label, slug) values ('Existing', 'existing');
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20261128070000_create_article_with_hashtags.sql", import.meta.url), "utf8"));
    const create = (tags) => db.query(`select article_create_with_hashtags(
      'Fixture', null, '{}'::jsonb, null, null, null, null, null, null, null, null, null, null, $1::text[]
    ) as id`, [tags]);
    await db.exec("set role anon; set test.can_create = 'yes'");
    await assert.rejects(create(["LocalNews"]), { code: "42501" });
    await db.exec("set role authenticated; set test.can_create = 'no'");
    await assert.rejects(create(["LocalNews"]), { code: "42501" });
    await db.exec("set test.can_create = 'yes'");
    await assert.rejects(create(Array.from({ length: 13 }, (_, index) => `tag${index}`)), { code: "22023" });
    const { rows: [article] } = await create(["EpeNews", "epenews", "EXISTING"]);
    await db.exec("reset role");
    const { rows } = await db.query(`select tags.label from articles
      join article_version_tags on version_id = current_version_id
      join tags on tags.id = tag_id where articles.id = $1 order by tags.label`, [article.id]);
    assert.deepEqual(rows, [{ label: "EpeNews" }, { label: "Existing" }]);
    assert.equal((await db.query("select count(*)::int as count from articles")).rows[0].count, 1);
  } finally {
    await db.close();
  }
});

test("cron history exposes only audit staff reads and service-role RPCs", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create publication supabase_realtime;
      create function public.has_capability(text) returns boolean language sql as
        $$ select $1 = any(string_to_array(coalesce(current_setting('test.capabilities', true), ''), ',')) $$;
    `);
    for (const migration of ["20261126000000_cron_job_history.sql", "20261128071000_restrict_cron_history_access.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
    }
    await db.exec("set role service_role");
    assert.ok((await db.query("select public.cron_job_start('fixture') as job")).rows[0].job);
    assert.equal((await db.query("select count(*)::int as count from public.get_cron_job_history(1)")).rows[0].count, 1);
    await db.exec("set role authenticated; set test.capabilities = 'admin.access'");
    await assert.rejects(db.query("select public.cron_job_start('unauthorized')"), { code: "42501" });
    await assert.rejects(db.query("select public.get_cron_job_history(1)"), { code: "42501" });
    assert.equal((await db.query("select count(*)::int as count from cron_job_history")).rows[0].count, 0);
    await db.exec("set test.capabilities = 'admin.access,audit.read'");
    assert.equal((await db.query("select count(*)::int as count from cron_job_history")).rows[0].count, 1);
    await db.exec("set role anon");
    await assert.rejects(db.query("select public.get_cron_job_history(1)"), { code: "42501" });
  } finally {
    await db.close();
  }
});
