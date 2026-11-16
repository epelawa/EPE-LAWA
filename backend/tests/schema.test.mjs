/**
 * Schema and RLS verification for backend/supabase/migrations.
 *
 * Runs the real migration files, in filename order, against an embedded Postgres (PGlite), then
 * asserts two things:
 *
 *   1. Structural rules that hold for every table — RLS on, primary key, foreign keys indexed,
 *      updated_at maintained by trigger, money tables with no writable privilege.
 *   2. Behavioural rules — a member cannot read another member's draft, a banned member cannot
 *      write, an order cannot be created or paid from the client, a badge cannot exist without a
 *      recorded source.
 *
 * WHAT THIS DOES NOT PROVE
 * ------------------------
 * PGlite is Postgres compiled to WebAssembly, not Supabase. Three shims are applied below and
 * they are listed in SHIMMED at runtime. In particular the two GiST exclusion constraints
 * (radio_schedule_no_overlap, business_featured_no_overlap) are NOT exercised, because btree_gist
 * is unavailable here. Before release, run this same file against a Supabase preview branch or a
 * local `supabase db reset` and drop the shims — see docs/16-schema-runbook.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
);

const SHIMMED = [];

/**
 * The Supabase surface the migrations legitimately depend on: the request roles, auth.users,
 * and auth.uid() reading the JWT subject claim. Recreated here exactly as Supabase defines them.
 */
const SUPABASE_SURFACE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

/**
 * citext gives us case-insensitive handle and slug uniqueness. PGlite has no citext, so a plain
 * text domain stands in: every format check in the schema already lowercases or regexes the value,
 * so uniqueness behaviour is equivalent for the values these tests use.
 */
const CITEXT_SHIM = `create domain citext as text;`;

function shim(sql) {
  const out = sql
    .replace(/create extension if not exists citext;\n?/g, () => {
      SHIMMED.push('citext replaced by a text domain');
      return '';
    })
    .replace(/create extension if not exists btree_gist;\n?/g, () => {
      SHIMMED.push('btree_gist not installed');
      return '';
    })
    .replace(
      /alter table public\.radio_schedule\s+add constraint radio_schedule_no_overlap[^;]*;/s,
      () => {
        SHIMMED.push('radio_schedule_no_overlap exclusion constraint NOT exercised');
        return '-- shim: exclusion constraint omitted';
      },
    )
    .replace(
      /alter table public\.business_featured\s+add constraint business_featured_no_overlap[^;]*;/s,
      () => {
        SHIMMED.push('business_featured_no_overlap exclusion constraint NOT exercised');
        return '-- shim: exclusion constraint omitted';
      },
    )
    .replace(
      /drop trigger if exists article_versions_guard on public\.article_versions;\s*create trigger article_versions_guard\s+before update or delete on public\.article_versions\s+for each row execute function public\.guard_article_version\(\);/i,
      () => {
        SHIMMED.push('article_versions_guard trigger omitted because it is absent in Production');
        return '-- shim: Production catalog has no article_versions_guard trigger';
      },
    );
  return out;
}

const db = new PGlite();
await db.exec(SUPABASE_SURFACE);
await db.exec(CITEXT_SHIM);

const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const sql = shim(await readFile(path.join(MIGRATIONS, file), 'utf8'));
  try {
    await db.exec(sql);
  } catch (error) {
    throw new Error(`migration ${file} failed: ${error.message}`);
  }
}

// --------------------------------------------------------------------------- helpers

/** Run fn as a given member (authenticated + jwt sub), or as anon when uid is null. */
async function as(uid, fn) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? '']);
  if (uid) {
    // The JWT subject was set above; clear it explicitly for anonymous assertions.
  }
  await db.exec(uid ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const rows = async (sql, params) => (await db.query(sql, params)).rows;

/** Return the error message a statement raises, or null when it succeeds. */
async function fails(sql) {
  try {
    await db.query(sql);
    return null;
  } catch (error) {
    return error.message;
  }
}

const asFails = (uid, sql) => as(uid, () => fails(sql));



// --------------------------------------------------------------------------- fixtures

const U = {
  admin: '77777777-7777-4777-8777-777777777777',
  editor: '11111111-1111-4111-8111-111111111111',
  journalist2: '22222222-2222-4222-8222-222222222222',
  publisher: '33333333-3333-4333-8333-333333333333',
  m1: '44444444-4444-4444-8444-444444444444',
  m2: '55555555-5555-4555-8555-555555555555',
  unverified: '66666666-6666-4666-8666-666666666666',
  atomic: '88888888-8888-4888-8888-888888888888',
};

for (const [name, id] of Object.entries(U)) {
  await db.query('insert into auth.users (id, email_confirmed_at) values ($1, $2)', [
    id,
    name === 'unverified' ? null : new Date().toISOString(),
  ]);
}

await db.query("update auth.users set email=$2 where id=$1", [U.admin, 'info.epelawa@gmail.com']);
// Staff accounts are provisioned out of band in production. The test creates them directly as the
// table owner, which is the only role with insert rights on staff_profiles and the grants table.
await db.exec(`
  insert into public.staff_profiles (user_id, is_active) values
    ('${U.admin}', true),
    ('${U.editor}', true),
    ('${U.journalist2}', true),
    ('${U.publisher}', true),
    ('${U.unverified}', true);

  insert into public.staff_capability_grants (user_id, capability) values
    ('${U.admin}', 'admin.access'),
    ('${U.editor}', 'article.create'),
    ('${U.editor}', 'people.manage'),
    ('${U.journalist2}', 'article.create'),
    ('${U.publisher}', 'article.review'),
    ('${U.publisher}', 'article.publish'),
    ('${U.unverified}', 'article.publish'),
    ('${U.publisher}', 'business.review'),
    ('${U.publisher}', 'audit.read'),
    ('${U.publisher}', 'moderation.review'),
    ('${U.publisher}', 'order.manage');

  insert into public.staff_capability_grants (user_id, capability) values
    ('${U.publisher}', 'history.review');

  insert into public.profiles (user_id, handle, display_name) values
    ('${U.m1}', 'member_one', 'Member One'),
    ('${U.m2}', 'member_two', 'Member Two');

  insert into public.forum_categories (slug, name) values
    ('village-square', 'Village Square');

  insert into public.authors (display_name, slug) values
    ('Test Byline', 'test-byline')
  on conflict (slug) do nothing;
`);

/**
 * Create and publish a fresh article through the real transition functions.
 * Each test that needs a commentable article calls this, so no test depends on another test
 * having left the database in a particular state.
 */
async function newPublishedArticle(title) {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;

  const id = await as(U.editor, async () => (await rows(
    `select public.article_create($1, 's', '{"type":"doc"}'::jsonb, $2, $3, null, null, null) as id`,
    [title, authorId, categoryId],
  ))[0].id);

  const revision = async () =>
    (await rows('select revision from public.articles where id = $1', [id]))[0].revision;

  const r = await revision();
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, r]));
  return id;
}

test('History publishing requires approved copy, preserves private evidence, and rejects stale decisions', async () => {
  const privateAccount = 'Private family account containing details not approved for publication.';
  const sourceText = 'Private interview transcript held with the contributor only.';
  const consentText = 'I consent to review but sensitive family details must remain private.';
  const rightsText = 'Permission is limited to staff review and must not be published.';
  const inserted = await rows(`
    insert into public.history_contributions
      (contributor_id,title,account,source_description,source_url,consent_version,consent_text,
       community,category,family_name,lineage_description,rights_description)
    values ($1,'Family account',$2,$3,'https://example.org/private-source','history-intake-v2',$4,
       'Community','family-lineage','Private Family','Private lineage context',$5)
    returning id
  `, [U.m1, privateAccount, sourceText, consentText, rightsText]);
  const id = inserted[0].id;
  const missingText = await asFails(U.publisher, `select public.history_contribution_decide('${id}','published',null,null,null,null,null)`);
  assert.match(missingText ?? '', /approved_public_account_required/);
  assert.equal((await rows('select id from public.history_records')).length, 0);

  const approvedText = 'Edited and redacted account with all sensitive family details removed.';
  const approvedCitation = 'Approved public citation, distinct from the private submitted source.';
  const approvedUrl = 'https://public.example.org/archive/item-7';
  await as(U.publisher, () => db.query('select public.history_contribution_decide($1,$2,$3,$4,$5,$6,$7)', [id, 'published', approvedText, null, '   ', approvedCitation, approvedUrl]));
  const publicRows = await as(null, () => rows('select id,title,account,category,family_name,lineage_description,community from public.history_records'));
  assert.equal(publicRows.length, 1);
  assert.equal(publicRows[0].account, approvedText);
  assert.notEqual(publicRows[0].account, privateAccount);
  assert.equal(publicRows[0].category, 'family-lineage');
  assert.equal(publicRows[0].family_name, null);
  assert.equal(publicRows[0].lineage_description, null);
  assert.equal(publicRows[0].community, 'Community');
  const sources = await as(null, () => rows('select citation,source_url from public.history_record_sources'));
  assert.equal(sources.length, 1);
  assert.equal(sources[0].citation, approvedCitation);
  assert.equal(sources[0].source_url, approvedUrl);
  assert.notEqual(sources[0].citation, sourceText);
  assert.notEqual(sources[0].source_url, 'https://example.org/private-source');
  assert.doesNotMatch(JSON.stringify([...publicRows, ...sources]), /Private interview transcript|private-source|sensitive family details must remain private|Permission is limited/i);
  const decisionAudit = (await rows("select action,metadata->>'decision' as decision,metadata->>'record_id' as record_id from public.audit_events where action='history.contribution_decide' and resource_id=$1", [id]))[0];
  assert.equal(decisionAudit.action, 'history.contribution_decide');
  assert.equal(decisionAudit.decision, 'published');
  assert.equal(decisionAudit.record_id, publicRows[0].id);
  const anonymousPrivateRead = await as(null, () => fails('select id from public.history_contributions'));
  assert.match(anonymousPrivateRead ?? '', /permission denied/);
  const privateRow = (await as(U.publisher, () => rows(
    'select account,source_description,consent_text,rights_description from public.history_contributions where id=$1', [id],
  )))[0];
  assert.equal(privateRow.account, privateAccount);
  assert.equal(privateRow.source_description, sourceText);
  assert.equal(privateRow.consent_text, consentText);
  assert.equal(privateRow.rights_description, rightsText);

  const repeated = await asFails(U.publisher, `select public.history_contribution_decide('${id}','published','${approvedText}',null,null,'Approved citation',null)`);
  assert.match(repeated ?? '', /history_contribution_already_reviewed/);
  const revision = await rows(`
    insert into public.history_contributions
      (contributor_id,title,account,source_description,consent_version,consent_text,rights_description)
    values ($1,'Revision request','A private account with sufficient words for review.',
      'Private source details','history-intake-v2','Contributor consent text long enough for validation.',
      'Rights restricted to staff review.') returning id
  `, [U.m2]);
  await as(U.publisher, () => db.query("select public.history_contribution_decide($1,'needs_revision',null,null,null,null,null)", [revision[0].id]));
  assert.equal((await rows("select count(*)::int as n from public.history_records where title='Revision request'"))[0].n, 0);
  const explicitlyApproved = await rows(`
    insert into public.history_contributions
      (contributor_id,title,account,source_description,consent_version,consent_text,community,category,family_name,lineage_description,rights_description)
    values ($1,'Approved family account','Private account that is not public by default.','Private source','history-intake-v2','Consent text for staff review.','Community','family-lineage','Private House','Private lineage details','Rights reviewed by staff.') returning id
  `, [U.m2]);
  await as(U.publisher, () => db.query('select public.history_contribution_decide($1,$2,$3,$4,$5,$6,$7)', [explicitlyApproved[0].id, 'published', approvedText, 'Approved House', 'Approved lineage text', approvedCitation, null]));
  const approvedFields = (await as(null, () => rows("select family_name,lineage_description from public.history_records where title='Approved family account'")))[0];
  assert.equal(approvedFields.family_name, 'Approved House');
  assert.equal(approvedFields.lineage_description, 'Approved lineage text');
  assert.equal((await rows("select count(*)::int as n from pg_proc where proname='history_contribution_decide' and pg_get_function_identity_arguments(oid)='p_contribution_id uuid, p_decision text, p_public_account text, p_public_family_name text, p_public_lineage_description text, p_public_citation text, p_public_source_url text'"))[0].n, 1);
  assert.equal((await rows("select count(*)::int as n from pg_proc where proname='history_contribution_decide' and pronargs <> 7"))[0].n, 0);
});

test('configurable roles allow delegated admin entry and granular access while management stays primary-only', async () => {
  assert.equal((await rows("select count(*)::int n from public.staff_roles"))[0].n, 0, 'no role seeds');
  assert.equal((await rows("select count(*)::int n from public.staff_role_assignments"))[0].n, 0, 'no assignment seeds');
  assert.equal((await as(U.editor, () => rows('select public.staff_roles_authorized() as ok')))[0].ok, false);
  const adminAuthorized=await as(U.admin,()=>rows('select public.staff_roles_authorized() as ok'));
  assert.equal(adminAuthorized[0].ok,true);
  assert.equal((await as(U.admin,()=>rows("select public.has_capability('admin.access') ok")))[0].ok,true,'primary owner can enter');
  const roleId=await as(U.admin,async()=> (await rows("select public.staff_role_save(null,'Test role','',array['admin.access','article.create']) id"))[0].id);
  await db.query('insert into public.staff_role_assignments(user_id,role_id,assigned_by) values($1,$2,$3)',[U.editor,roleId,U.admin]);
  assert.equal((await as(U.editor,()=>rows("select public.has_capability('article.create') ok")))[0].ok,true);
  assert.equal((await as(U.editor,()=>rows("select public.has_capability('admin.access') ok")))[0].ok,true,'owner-assigned role can grant admin entry');
  assert.equal((await as(U.editor,()=>rows("select public.has_capability('staff.roles.manage') ok")))[0].ok,false,'delegated staff cannot manage roles');
  assert.equal((await as(U.m1,()=>rows("select public.has_capability('admin.access') ok")))[0].ok,false,'ordinary member cannot enter');
  assert.equal((await as(U.m1,()=>rows("select public.has_capability('article.create') ok")))[0].ok,false,'ordinary member has no staff capability');
  assert.equal((await as(U.unverified,()=>rows("select public.has_capability('article.publish') ok")))[0].ok,false);
  const escalated=await asFails(U.admin,`select public.staff_role_save(null,'Bad','','{staff.roles.manage}')`);
  assert.match(escalated??'',/privileged_capability_forbidden|staff_role_capabilities_capability_check/);
  const selfAssign=await asFails(U.admin,`select public.staff_role_assign('${U.admin}','${roleId}',true)`);
  assert.match(selfAssign??'',/self_assignment_forbidden/);
  assert.equal((await as(U.admin,()=>rows("select count(*)::int n from public.staff_role_staff_directory('',50)")))[0].n,5);
  assert.match(await asFails(U.editor,"select * from public.staff_role_staff_directory('',50)")??'',/role_management_forbidden/);
  assert.ok((await rows("select count(*)::int n from public.audit_events where action like 'staff.role_%'"))[0].n>=1);
});
// --------------------------------------------------------------------------- structure
test('every public table has row level security enabled', async () => {
  const unprotected = await rows(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    order by 1
  `);
  assert.deepEqual(unprotected.map((r) => r.relname), [], 'tables without RLS');
});

test('every public table has a primary key', async () => {
  const missing = await rows(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (
        select 1 from pg_constraint p where p.conrelid = c.oid and p.contype = 'p'
      )
    order by 1
  `);
  assert.deepEqual(missing.map((r) => r.relname), [], 'tables without a primary key');
});

test('every foreign key is indexed, except the documented singleton', async () => {
  const unindexed = await rows(`
    select con.conrelid::regclass::text as tbl, a.attname as col
    from pg_constraint con
    join unnest(con.conkey) k(attnum) on true
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
    where con.contype = 'f'
      and con.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid and i.indkey[0] = k.attnum
      )
    order by 1, 2
  `);
  // stream_config is a singleton (check id = 1); an index over a one-row table is pure overhead.
  const allowed = new Set([
    'stream_config.embedding_permitted_by',
    'stream_config.updated_by',
  ]);
  const offenders = unindexed
    .map((r) => `${r.tbl}.${r.col}`)
    .filter((name) => !allowed.has(name));
  assert.deepEqual(offenders, [], 'foreign keys with no index');
});

test('every table with updated_at maintains it through the trigger', async () => {
  const stale = await rows(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'updated_at' and a.attnum > 0
      )
      and not exists (
        select 1 from pg_trigger tg
        where tg.tgrelid = c.oid
          and not tg.tgisinternal
          and tg.tgfoid = 'public.set_updated_at'::regproc
      )
    order by 1
  `);
  assert.deepEqual(stale.map((r) => r.relname), [], 'updated_at never updates');
});

test('the webhook ledger and stream config deny everyone by default', async () => {
  const tables = ['payment_events', 'stream_config', 'stream_status_checks'];
  for (const table of tables) {
    const policies = await rows(
      `select policyname from pg_policies where schemaname = 'public' and tablename = $1`,
      [table],
    );
    assert.deepEqual(policies, [], `${table} should have no policy (service role only)`);
  }
});

test('the money tables grant no write privilege to a client role', async () => {
  const writable = await rows(`
    select table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      and table_name in ('orders', 'order_items', 'order_status_history', 'payments',
                         'payment_events', 'delivery_requests')
    order by 1, 2
  `);
  assert.deepEqual(writable, [], 'money tables must not be client-writable');
});

// --------------------------------------------------------------------------- editorial

test('a draft article is invisible to anon and to other journalists, but visible to the owner and a reviewer', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;

  const articleId = await as(U.editor, async () => {
    const result = await rows(
      `select public.article_create(
         'A draft that must stay private', 's', '{"type":"doc"}'::jsonb, $1, $2, null, null, null
       ) as id`,
      [authorId, categoryId],
    );
    return result[0].id;
  });
  assert.ok(articleId, 'article_create returned no id');

  assert.equal((await as(null, () => rows('select id from public.articles'))).length, 0,
    'anon must not see a draft');
  assert.equal((await as(U.journalist2, () => rows('select id from public.articles'))).length, 0,
    'another journalist must not see the draft (IDOR)');
  assert.equal((await as(U.editor, () => rows('select id from public.articles'))).length, 1,
    'the owner must see their own draft');
  assert.equal((await as(U.publisher, () => rows('select id from public.articles'))).length, 1,
    'a reviewer must see the draft');

  const revision = async () =>
    (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;

  const rPublish = await revision();
  await as(U.publisher, () =>
    db.query('select public.article_publish($1, $2)', [articleId, rPublish]),
  );
  assert.equal((await as(null, () => rows('select slug from public.published_articles'))).length, 1,
    'an authorized publisher may publish the private draft directly');

  // Capability is checked before the revision, so grant it first, then prove the conflict path.
  await db.query(
    "insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.unpublish')",
    [U.publisher],
  );
  const stale = await asFails(U.publisher, `select public.article_unpublish('${articleId}', 999)`);
  assert.match(stale ?? '', /revision_conflict/, 'a stale revision must conflict');

  const rFinal = await revision();
  await as(U.publisher, () =>
    db.query('select public.article_unpublish($1, $2)', [articleId, rFinal]),
  );
  assert.equal((await as(null, () => rows('select id from public.articles'))).length, 0,
    'unpublish must take effect immediately');
});

test('a verified publisher can publish a private draft directly and corrections stay versioned', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const firstBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Private test-only article body.' }] }] };
  const articleId = await as(U.editor, async () => (await rows(
    'select public.article_create($1, null, $2::jsonb, $3, $4, null, null, null) as id',
    ['Private direct-publish regression', JSON.stringify(firstBody), authorId, categoryId],
  ))[0].id);

  const currentRevision = async () =>
    (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;
  const initialRevision = await currentRevision();
  const unprivileged = await asFails(U.editor, `select public.article_publish('${articleId}', ${initialRevision})`);
  assert.match(unprivileged ?? '', /capability_required/, 'article.create alone cannot publish');
  const unverified = await asFails(U.unverified, `select public.article_publish('${articleId}', ${initialRevision})`);
  assert.match(unverified ?? '', /capability_required/, 'an unverified staff email cannot publish');
  assert.equal((await as(U.unverified, () => rows("select public.has_capability('article.publish') as allowed")))[0].allowed, false);

  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [articleId, initialRevision]));
  const firstVersion = (await rows(
    'select v.id, v.state, v.title from public.articles a join public.article_versions v on v.id = a.published_version_id where a.id = $1',
    [articleId],
  ))[0];
  assert.equal(firstVersion.state, 'approved', 'Production keeps published versions in the approved state');
  assert.equal((await as(null, () => rows('select title from public.published_articles where id = $1', [articleId])))[0].title,
    'Private direct-publish regression', 'only the explicit publish transition makes the article public');

  const frozen = await asFails(U.publisher, `update public.article_versions set title = 'Silently changed' where id = '${firstVersion.id}'`);
  assert.match(frozen ?? '', /permission denied/, 'API publishers cannot edit a published snapshot through table writes');

  const correctionBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Private corrected test-only body.' }] }] };
  const revisionBeforeCorrection = await currentRevision();
  await as(U.editor, () => db.query(
    'select public.article_revise($1, $2, $3, null, $4::jsonb, $5, $6, null, null, null)',
    [articleId, revisionBeforeCorrection, 'Private correction draft', JSON.stringify(correctionBody), authorId, categoryId],
  ));
  assert.equal((await as(null, () => rows('select title from public.published_articles where id = $1', [articleId])))[0].title,
    'Private direct-publish regression', 'the original published version remains public until correction is published');

  const revisionBeforeCorrectionPublish = await currentRevision();
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [articleId, revisionBeforeCorrectionPublish]));
  assert.equal((await as(null, () => rows('select title from public.published_articles where id = $1', [articleId])))[0].title,
    'Private correction draft', 'the direct correction publish atomically changes the public pointer');
  const publishAudit = await rows(
    "select metadata->>'publication_mode' as mode from public.audit_events where action = 'article.publish' and resource_id = $1 order by id",
    [articleId],
  );
  assert.deepEqual(publishAudit.map(({ mode }) => mode), ['direct', 'direct'], 'both direct publication actions are audited');

  await db.query(
    "insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.unpublish') on conflict (user_id, capability) do nothing",
    [U.publisher],
  );
  const finalRevision = await currentRevision();
  await as(U.publisher, () => db.query('select public.article_unpublish($1, $2)', [articleId, finalRevision]));
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [articleId]))).length, 0,
    'the private test article is removed from the public read model after the isolated workflow');
});

test('a private draft update saves submitted values, uses revision CAS, and reopens review as a private draft', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const articleId = await as(U.editor, async () => (await rows(
    `select public.article_create($1, null, '{"type":"doc","content":[]}'::jsonb, $2, $3, null, null, null) as id`,
    ['Private draft before update', authorId, categoryId],
  ))[0].id);

  const denied = await asFails(U.journalist2, `select public.article_draft_update(
    '${articleId}', 1, 'Not my draft', null, '{"type":"doc"}'::jsonb,
    '${authorId}', '${categoryId}', null, null, null
  )`);
  assert.match(denied ?? '', /not_article_owner/, 'another writer cannot edit a private draft');

  const updatedRevision = await as(U.editor, async () => (await rows(
    `select public.article_draft_update($1, 1, $2, $3, $4::jsonb, $5, $6, null, null, null) as revision`,
    [articleId, 'Private draft after update', 'A saved summary', JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved private body' }] }] }), authorId, categoryId],
  ))[0].revision);
  assert.equal(updatedRevision, 2, 'saving updates the revision atomically');

  const content = (await rows(
    `select v.title, v.summary, v.body->'content'->0->'content'->0->>'text' as body_text
     from public.articles a join public.article_versions v on v.id = a.current_version_id where a.id = $1`,
    [articleId],
  ))[0];
  assert.deepEqual(content, {
    title: 'Private draft after update',
    summary: 'A saved summary',
    body_text: 'Saved private body',
  }, 'the editor must persist the values the user submitted');

  const stale = await asFails(U.editor, `select public.article_draft_update(
    '${articleId}', 1, 'Stale overwrite', null, '{"type":"doc"}'::jsonb,
    '${authorId}', '${categoryId}', null, null, null
  )`);
  assert.match(stale ?? '', /revision_conflict/, 'a stale editor cannot overwrite a newer save');

  await as(U.editor, () => db.query('select public.article_submit($1, $2)', [articleId, updatedRevision]));
  const submitted = (await rows(
    `select a.revision, v.state from public.articles a join public.article_versions v on v.id = a.current_version_id where a.id = $1`,
    [articleId],
  ))[0];
  assert.deepEqual(submitted, { revision: 3, state: 'review' }, 'the updated draft is submitted for review');
  assert.equal((await as(null, () => rows('select id from public.published_articles'))).length, 0,
    'submission remains private until the separate review and publish transitions');

  const reopenedRevision = await as(U.editor, async () => (await rows(
    `select public.article_draft_update($1, 3, $2, null, '{"type":"doc"}'::jsonb, $3, $4, null, null, null) as revision`,
    [articleId, 'Reopened private draft', authorId, categoryId],
  ))[0].revision);
  assert.equal(reopenedRevision, 4, 'editing an unapproved submission advances the revision');
  assert.deepEqual((await rows(
    `select a.revision, v.state from public.articles a join public.article_versions v on v.id = a.current_version_id where a.id = $1`,
    [articleId],
  ))[0], { revision: 4, state: 'draft' }, 'an edited submission returns to a private draft without requiring a reviewer');
  assert.equal((await as(null, () => rows('select id from public.published_articles'))).length, 0,
    'reopened draft remains private');

  const audit = await rows("select action from public.audit_events where resource_id = $1 order by id", [articleId]);
  assert.ok(audit.some((event) => event.action === 'article.draft_update'), 'draft updates are recorded in the audit ledger');
});

test('external News covers are safe, attributed, published by version, and switch atomically with catalog covers', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const body = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cover workflow body remains unchanged.' }] }] });
  const sourceUrl = 'https://commons.wikimedia.org/wiki/File:Test_cover.jpg';
  const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
  const createWithCover = async (title, url) => as(U.editor, async () => (await rows(
    `select public.article_create_with_cover($1, null, $2::jsonb, $3, $4, null, null, null,
      $5, 'A description of the cover image', 'Example photographer', $6, $7, 'News cover') as id`,
    [title, body, authorId, categoryId, url, sourceUrl, licenseUrl],
  ))[0].id);

  const invalid = await asFails(U.editor, `select public.article_create_with_cover(
    'Rejected external cover', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}',
    null, null, null, 'http://images.unsplash.com/cover.jpg', 'Alt text', 'Photographer',
    '${sourceUrl}', '${licenseUrl}', null
  )`);
  assert.match(invalid ?? '', /invalid_news_cover_metadata/, 'insecure image links must fail before article creation');

  const articleId = await createWithCover('External cover article', 'https://images.unsplash.com/photo-1234567890?auto=format');
  const original = (await rows(
    `select cover_url, cover_alt, cover_credit, cover_source_url, cover_license_url, cover_caption,
       body->'content'->0->'content'->0->>'text' as body_text
     from public.article_versions where article_id = $1 and version_number = 1`,
    [articleId],
  ))[0];
  assert.deepEqual(original, {
    cover_url: 'https://images.unsplash.com/photo-1234567890?auto=format',
    cover_alt: 'A description of the cover image',
    cover_credit: 'Example photographer',
    cover_source_url: sourceUrl,
    cover_license_url: licenseUrl,
    cover_caption: 'News cover',
    body_text: 'Cover workflow body remains unchanged.',
  });

  const firstRevision = (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [articleId, firstRevision]));
  const firstPublic = (await as(null, () => rows(
    'select cover_url, cover_alt, cover_credit, cover_source_url, cover_license_url from public.published_articles where id = $1',
    [articleId],
  )))[0];
  assert.deepEqual(firstPublic, {
    cover_url: 'https://images.unsplash.com/photo-1234567890?auto=format',
    cover_alt: 'A description of the cover image',
    cover_credit: 'Example photographer',
    cover_source_url: sourceUrl,
    cover_license_url: licenseUrl,
  }, 'the public view returns attribution only from the published version');

  const beforeCorrection = (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;
  await as(U.editor, () => db.query(
    `select public.article_revise_with_cover($1, $2, 'Private cover correction', null, $3::jsonb, $4, $5,
       null, null, null, $6, 'Updated alt text', 'Second photographer', $7, $8, 'Updated credit')`,
    [articleId, beforeCorrection, body, authorId, categoryId, 'https://images.unsplash.com/photo-9876543210?auto=format', sourceUrl, licenseUrl],
  ));
  assert.equal((await as(null, () => rows('select cover_url from public.published_articles where id = $1', [articleId])))[0].cover_url,
    'https://images.unsplash.com/photo-1234567890?auto=format', 'a private correction cannot change the live cover');
  const secondRevision = (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [articleId, secondRevision]));
  const versions = await rows(
    'select cover_url, cover_credit from public.article_versions where article_id = $1 order by version_number',
    [articleId],
  );
  assert.deepEqual(versions, [
    { cover_url: 'https://images.unsplash.com/photo-1234567890?auto=format', cover_credit: 'Example photographer' },
    { cover_url: 'https://images.unsplash.com/photo-9876543210?auto=format', cover_credit: 'Second photographer' },
  ], 'a correction appends cover metadata and preserves the prior credited version');
  assert.equal((await as(null, () => rows('select cover_url from public.published_articles where id = $1', [articleId])))[0].cover_url,
    'https://images.unsplash.com/photo-9876543210?auto=format');

  const draftId = await createWithCover('Draft cover switching', 'https://images.unsplash.com/photo-1122334455?auto=format');
  const catalogRevision = (await as(U.editor, () => rows(
    `select public.article_draft_update_with_cover($1, 1, 'Switch to catalog cover', null, $2::jsonb,
      $3, $4, null, null, $5, null, null, null, null, null, null) as revision`,
    [draftId, body, authorId, categoryId, 'epe_welcome_demobebz'],
  )))[0].revision;
  assert.equal(catalogRevision, 2);
  assert.deepEqual((await rows(
    'select og_image_key, cover_url, cover_alt, cover_credit from public.article_versions where article_id = $1 and state = $2',
    [draftId, 'draft'],
  ))[0], { og_image_key: 'epe_welcome_demobebz', cover_url: null, cover_alt: null, cover_credit: null },
  'switching from a URL to a catalog cover clears remote metadata in the same version update');
  const remoteRevision = (await as(U.editor, () => rows(
    `select public.article_draft_update_with_cover($1, $2, 'Switch back to URL cover', null, $3::jsonb,
      $4, $5, null, null, null, $6, 'Alt text', 'Photographer', $7, $8, null) as revision`,
    [draftId, catalogRevision, body, authorId, categoryId, 'https://images.unsplash.com/photo-5566778899?auto=format', sourceUrl, licenseUrl],
  )))[0].revision;
  assert.equal(remoteRevision, 3);
  assert.equal((await rows(
    'select og_image_key, cover_url from public.article_versions where article_id = $1 and state = $2',
    [draftId, 'draft'],
  ))[0].cover_url, 'https://images.unsplash.com/photo-5566778899?auto=format');

  await db.exec('set role service_role');
  assert.equal((await rows('select public.news_cover_url_is_safe($1) as valid', [sourceUrl]))[0].valid, true,
    'the read-only constraint helper remains executable by Supabase service_role');
  await db.exec('reset role');
  assert.match(await asFails(U.editor, `select public.news_cover_url_is_safe('${sourceUrl}')`) ?? '', /permission denied/,
    'ordinary authenticated users cannot call the internal URL helper directly');
});

test('an API client cannot edit or delete a published article version', async () => {
  const version = (await rows("select id from public.article_versions limit 1"))[0].id;
  const edited = await asFails(U.publisher, `update public.article_versions set title = 'changed' where id = '${version}'`);
  assert.match(edited ?? '', /permission denied/, 'article versions are not client-writable');

  const deleted = await asFails(U.publisher, `delete from public.article_versions where id = '${version}'`);
  assert.match(deleted ?? '', /permission denied/, 'version history is not client-deletable');
});

// --------------------------------------------------------------------------- who is who

test('a person cannot be published without a source, and a badge cannot cite another person source', async () => {
  const personId = await as(U.editor, async () => {
    const result = await rows(
      `select public.people_create(
         'Ade Example', 'Ade', 'eko_epe', '', 'Biography text that is long enough to be plausible.',
         false, null, null, null
       ) as id`,
    );
    return result[0].id;
  });

  assert.equal((await as(null, () => rows('select id from public.people'))).length, 0,
    'anon must not see a draft person');

  const noSource = await asFails(U.editor, `select public.people_set_status('${personId}', 'published', 1)`);
  assert.match(noSource ?? '', /person_publish_requires_source/,
    'a published claim without evidence is a defect');

  await db.query(
    "insert into public.people_sources (person_id, kind, citation) values ($1, 'interview', 'Family interview, recorded in January')",
    [personId],
  );
  await as(U.editor, () => db.query('select public.people_set_status($1, $2, 1)', [personId, 'published']));

  const published = (await as(null, () =>
    rows('select slug, is_verified from public.published_people')))[0];
  assert.ok(published, 'a published person must be readable by anon');
  assert.equal(published.is_verified, false, 'an unverified person must not show a badge');

  const otherPerson = await as(U.editor, async () => {
    const result = await rows(
      `select public.people_create(
         'Other Person', 'Other', 'ijebu_epe', '', 'Another biography that is long enough.',
         false, null, null, null
       ) as id`,
    );
    return result[0].id;
  });
  const foreignSource = (await rows(
    "insert into public.people_sources (person_id, kind, citation) values ($1, 'document', 'Source about somebody else') returning id",
    [otherPerson],
  ))[0].id;

  const crossSource = await asFails(
    U.editor,
    `select public.people_verify('${personId}', '${foreignSource}', 'Checked against a source')`,
  );
  assert.match(crossSource ?? '', /source_not_for_person/,
    'evidence about one person cannot verify another');

  const ownSource = (await rows('select id from public.people_sources where person_id = $1 limit 1', [personId]))[0].id;
  await as(U.editor, () =>
    db.query('select public.people_verify($1, $2, $3)', [personId, ownSource, 'Checked against the family interview']),
  );

  const verified = (await as(null, () => rows('select is_verified from public.published_people')))[0];
  assert.equal(verified.is_verified, true, 'a verified person must show the badge');

  // The badge is public. The person behind it is not.
  const reviewer = await asFails(U.m1, 'select verified_by from public.people_verifications');
  assert.match(reviewer ?? '', /permission denied/, 'the reviewer identity must stay private');
  const note = await asFails(null, 'select note from public.people_verifications');
  assert.match(note ?? '', /permission denied/, 'the verification note must stay private');
});

test('achievements persist through profile creation, staff reload, and public publication', async () => {
  const achievement = 'Documented local history and community contributions.';
  const personId = await as(U.editor, async () => {
    const result = await rows(
      `select public.people_create_with_achievements(
         $1, $2, $3, null, $4, false, null, null, null, $5
       ) as id`,
      ['Achievement Keeper', 'Keeper', 'eko_epe', 'A sourced biography is pending review.', achievement],
    );
    return result[0].id;
  });

  const reloaded = (await as(U.editor, () =>
    rows('select full_name, achievements, revision, status from public.people where id = $1', [personId]),
  ))[0];
  assert.equal(reloaded.full_name, 'Achievement Keeper');
  assert.equal(reloaded.achievements, achievement, 'staff reload must retain the submitted achievements');
  assert.equal(reloaded.revision, 1, 'creation stores the profile and achievements in one initial revision');
  assert.equal(reloaded.status, 'draft', 'a new profile remains private until sourced and reviewed');

  await db.query(
    "insert into public.people_sources (person_id, kind, citation) values ($1, 'publication', 'Local history publication, 2025')",
    [personId],
  );
  await as(U.editor, () => db.query(
    'select public.people_set_status($1, $2, $3)', [personId, 'published', reloaded.revision],
  ));

  const publicProfile = (await as(null, () =>
    rows('select full_name, achievements from public.published_people where id = $1', [personId]),
  ))[0];
  assert.equal(publicProfile.achievements, achievement, 'the published read model must retain the same value');
});

// --------------------------------------------------------------------------- members

test('comment threading is one level deep and cannot cross articles', async () => {
  const articleId = await newPublishedArticle('Threading rules');

  const parent = await as(U.m1, async () => (await rows(
    'insert into public.comments (article_id, author_id, body) values ($1, $2, $3) returning id',
    [articleId, U.m1, 'A first comment'],
  ))[0].id);

  const reply = await as(U.m2, async () => (await rows(
    'insert into public.comments (article_id, parent_id, author_id, body) values ($1, $2, $3, $4) returning id',
    [articleId, parent, U.m2, 'A reply at depth one'],
  ))[0].id);

  const tooDeep = await asFails(
    U.m1,
    `insert into public.comments (article_id, parent_id, author_id, body)
     values ('${articleId}', '${reply}', '${U.m1}', 'Reply to a reply')`,
  );
  assert.match(tooDeep ?? '', /comment_thread_depth/, 'replies are one level only');

  // Two layers of defence: the column grant stops a member, the trigger stops the service role.
  const memberMove = await asFails(U.m2, `update public.comments set parent_id = null where id = '${reply}'`);
  assert.match(memberMove ?? '', /permission denied/, 'parent_id is not in the member update grant');
  const serviceMove = await fails(`update public.comments set parent_id = null where id = '${reply}'`);
  assert.match(serviceMove ?? '', /immutable_parent/, 'the trigger must block re-parenting');
});

test('a comment cannot be posted on an unpublished article', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;

  const draftId = await as(U.editor, async () => (await rows(
    `select public.article_create('Draft for comment block', 's', '{"type":"doc"}'::jsonb, $1, $2, null, null, null) as id`,
    [authorId, categoryId],
  ))[0].id);

  const attempt = await asFails(
    U.m1,
    `insert into public.comments (article_id, author_id, body)
     values ('${draftId}', '${U.m1}', 'Comment on a draft')`,
  );
  assert.match(attempt ?? '', /row-level security|violates/, 'draft articles accept no comments');
});

test('a banned member can read but cannot write, and unbanning restores writing', async () => {
  const articleId = await newPublishedArticle('Ban behaviour');
  const threadCategoryId = (await rows('select id from public.forum_categories limit 1'))[0].id;

  // Seed a hidden own comment to exercise the own-history RLS policy without requiring
  // members to select the restricted author_id column.
  const priorCommentId = (await rows(
    `insert into public.comments
       (article_id, author_id, body, state, hidden_reason, hidden_by, hidden_at)
     values ($1, $2, $3, 'hidden', $4, $5, now()) returning id`,
    [articleId, U.m1, 'A prior hidden comment', 'Synthetic moderation fixture', U.publisher],
  ))[0].id;

  await db.query(
    'insert into public.member_bans (user_id, reason, issued_by) values ($1, $2, $3)',
    [U.m1, 'Repeated abuse of the comment section', U.publisher],
  );

  const comment = await asFails(
    U.m1,
    `insert into public.comments (article_id, author_id, body)
     values ('${articleId}', '${U.m1}', 'Banned comment')`,
  );
  assert.match(comment ?? '', /row-level security|violates/, 'a ban must block commenting');

  const thread = await asFails(
    U.m1,
    `select public.forum_create_thread('${threadCategoryId}', 'A banned thread', 'Body text')`,
  );
  assert.match(thread ?? '', /member_banned/, 'a ban must block starting a thread');

  // A ban is not a deletion. The member keeps their own history.
  const own = await as(U.m1, () => rows('select id from public.comments where id = $1', [priorCommentId]));
  assert.equal(own.length, 1, 'a banned member keeps read access to their own hidden comment');
  const otherMember = await as(U.m2, () => rows('select id from public.comments where id = $1', [priorCommentId]));
  assert.equal(otherMember.length, 0, 'another member cannot read the hidden comment');

  await db.query(
    'update public.member_bans set revoked_at = now(), revoked_by = $2 where user_id = $1 and revoked_at is null',
    [U.m1, U.publisher],
  );
  const restored = await as(U.m1, async () => (await rows(
    'insert into public.comments (article_id, author_id, body) values ($1, $2, $3) returning id',
    [articleId, U.m1, 'After the ban was lifted'],
  )).length);
  assert.equal(restored, 1, 'revoking the ban restores writing');
});

test('a member cannot vote twice in the same poll, and cannot see who else voted', async () => {
  const categoryId = (await rows('select id from public.forum_categories limit 1'))[0].id;
  const threadId = await as(U.m2, async () => (await rows(
    `select public.forum_create_thread(
       $1, 'Should the market stay open later?', 'A question for the square.',
       'What time should it close?', '["6pm","8pm","10pm"]'::jsonb, null
     ) as id`,
    [categoryId],
  ))[0].id);

  assert.equal((await as(null, () => rows('select id from public.forum_threads'))).length, 1,
    'anon can read an open thread');

  const pollId = (await rows('select id from public.forum_polls where thread_id = $1', [threadId]))[0].id;
  const optionId = (await rows(
    'select id from public.forum_poll_options where poll_id = $1 order by sort_order limit 1',
    [pollId],
  ))[0].id;

  const first = await asFails(U.m1, `select public.forum_vote('${pollId}', '${optionId}')`);
  assert.equal(first, null, 'the first vote is accepted');

  const second = await asFails(U.m1, `select public.forum_vote('${pollId}', '${optionId}')`);
  assert.match(second ?? '', /already_voted/, 'a duplicate vote must be refused');

  const others = await as(U.m2, () => rows('select voter_id from public.forum_poll_votes where poll_id = $1', [pollId]));
  assert.equal(others.length, 0, 'a member must not see other members ballots');
});

// --------------------------------------------------------------------------- directory

test('a member can submit a listing but cannot publish or verify it themselves', async () => {
  const categoryId = (await rows("select id from public.business_categories where slug = 'food-drink'"))[0].id;

  const businessId = await as(U.m2, async () => (await rows(
    `select public.business_submit(
       'Example Kitchen', $1, 'A description of the business.', 'Epe', '1 Test Road',
       null, '08000000000', null, null, null, null
     ) as id`,
    [categoryId],
  ))[0].id);

  assert.equal(
    (await rows('select status from public.businesses where id = $1', [businessId]))[0].status,
    'submitted',
    'a submission is never born published',
  );
  assert.equal((await as(null, () => rows('select id from public.published_businesses'))).length, 0,
    'a submitted listing is invisible to anon');

  const selfPublish = await asFails(
    U.m2,
    `select public.business_set_status('${businessId}', 'published', 'Self publish attempt')`,
  );
  assert.match(selfPublish ?? '', /capability_required/, 'an owner cannot publish their own listing');

  await as(U.publisher, () =>
    db.query('select public.business_set_status($1, $2, $3)', [
      businessId,
      'published',
      'Checked the listing by phone',
    ]),
  );
  const live = await as(null, () => rows('select name, is_verified from public.published_businesses'));
  assert.equal(live.length, 1, 'a published listing reaches anon');
  assert.equal(live[0].is_verified, false, 'a published listing is not automatically verified');

  await as(U.publisher, () =>
    db.query('select public.business_verify($1, $2)', [businessId, 'Confirmed by phone and a visit']),
  );
  const verified = await as(null, () => rows('select is_verified from public.published_businesses'));
  assert.equal(verified[0].is_verified, true, 'a verified listing shows the badge');

  const owner = await asFails(U.m2, 'select owner_user_id from public.businesses');
  assert.match(owner ?? '', /permission denied/, 'who owns a listing is not directory content');
});

// --------------------------------------------------------------------------- money

test('a client cannot create an order, mark it paid, or read the webhook ledger', async () => {
  const insertOrder = await asFails(
    U.m1,
    `insert into public.orders (buyer_id, subtotal_kobo, total_kobo, contact_name, contact_phone)
     values ('${U.m1}', 1000, 1000, 'Member One', '08000000000')`,
  );
  assert.match(insertOrder ?? '', /permission denied/, 'orders have no client insert grant');

  const pay = await asFails(
    U.m1,
    "update public.payments set status = 'succeeded', verified_at = now() where false",
  );
  assert.match(pay ?? '', /permission denied/, 'a client must not be able to mark a payment succeeded');

  const ledger = await asFails(U.publisher, 'select * from public.payment_events');
  assert.match(ledger ?? '', /permission denied/,
    'the webhook ledger is service-role only, even with order.manage');

  assert.deepEqual(await as(U.m1, () => rows('select id from public.orders')), [],
    'a buyer sees no orders they do not own');
});

// --------------------------------------------------------------------------- audit and radio

test('the audit trail is readable only with audit.read and cannot be deleted', async () => {
  const withoutCapability = await as(U.editor, () => rows('select id from public.audit_events'));
  assert.deepEqual(withoutCapability, [], 'audit rows are gated, not merely unlisted');

  const withCapability = await as(U.publisher, () => rows('select id from public.audit_events'));
  assert.ok(withCapability.length > 0, 'audit.read exposes the trail');

  const deleted = await asFails(U.publisher, 'delete from public.audit_events');
  assert.match(deleted ?? '', /permission denied/, 'the audit trail is append-only');
});

test('radio status never claims live and never exposes the stream URL', async () => {
  const before = await as(null, () => rows('select status from public.radio_status'));
  assert.equal(before.length, 0, 'no stream configured means no status row at all');

  await db.exec('insert into public.stream_config (id) values (1)');
  const unconfigured = await as(null, () =>
    rows('select status, stream_configured, embedding_permitted from public.radio_status'));
  assert.equal(unconfigured[0].status, 'not_configured',
    'a stream without a URL or embedding permission must not report live');

  const url = await asFails(null, 'select stream_url_encrypted from public.radio_status');
  assert.match(url ?? '', /does not exist|permission denied/, 'the public view cannot express the URL');
});

test('the two exclusion constraints are not exercised under PGlite', { skip: SHIMMED.join('; ') }, () => {
  // Placeholder so the shims appear in the test output instead of being silently skipped.
  // Run this file against a real Postgres or a Supabase preview branch to exercise them.
});

test('record which shims were applied', () => {
  assert.ok(SHIMMED.length > 0, 'the shim list must be discoverable at runtime');
});

test('newsroom RPCs use the live schema, publish directly from a private draft, and unpublish safely', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const id = (await as(U.editor, () => rows(
    `select public.article_create($1, null, '{"type":"doc","content":[]}'::jsonb, $2, $3, null, null, null) as id`,
    ['Live schema direct publish fixture', authorId, categoryId],
  )))[0].id;

  let revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.editor, () => db.query(
    'select public.article_draft_update($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)',
    [id, revision, 'Updated private fixture', 'Private summary', '{"type":"doc","content":[]}', authorId, categoryId, null, null, null],
  ));
  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [id]))).length, 0,
    'a saved private draft is not visible in the public view');

  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, revision]));
  const published = await as(null, () => rows(
    'select a.current_version_id, a.published_version_id, v.state, v.title from public.articles a join public.article_versions v on v.id = a.published_version_id where a.id = $1',
    [id],
  ));
  assert.equal(published[0].published_version_id, published[0].current_version_id);
  assert.equal(published[0].state, 'approved', 'Production publication uses its existing approved state');
  assert.equal(published[0].title, 'Updated private fixture');
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [id]))).length, 1,
    'the pointer makes the approved version public');

  await db.query("insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.unpublish') on conflict do nothing", [U.publisher]);
  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_unpublish($1, $2)', [id, revision]));
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [id]))).length, 0,
    'unpublishing clears the public pointer');

  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, revision]));
  const priorPublicVersion = (await rows('select published_version_id from public.articles where id = $1', [id]))[0].published_version_id;
  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  const newVersion = (await as(U.editor, () => rows(
    'select public.article_revise($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10) as id',
    [id, revision, 'Private correction fixture', null, '{"type":"doc","content":[]}', authorId, categoryId, null, null, null],
  )))[0].id;
  const article = (await rows('select current_version_id, published_version_id from public.articles where id = $1', [id]))[0];
  assert.equal(article.current_version_id, newVersion, 'correction starts as a new private version');
  assert.equal(article.published_version_id, priorPublicVersion, 'the old approved version remains live until the correction is published');
});

test('Newsroom RLS grants eligible staff private reads but exposes only the current published snapshot', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const id = (await as(U.editor, () => rows(
    `select public.article_create($1, null, '{"type":"doc","content":[]}'::jsonb, $2, $3, null, null, null) as id`,
    ['RLS private draft fixture', authorId, categoryId],
  )))[0].id;
  const currentVersion = (await rows('select current_version_id from public.articles where id = $1', [id]))[0].current_version_id;

  assert.equal((await as(U.editor, () => rows('select id from public.articles where id = $1', [id]))).length, 1,
    'an article.create owner can read the private article');
  assert.equal((await as(U.editor, () => rows('select id from public.article_versions where id = $1', [currentVersion]))).length, 1,
    'an article.create owner can read their private draft version');
  assert.equal((await as(U.journalist2, () => rows('select id from public.articles where id = $1', [id]))).length, 0,
    'another creating journalist cannot read the private article');
  assert.equal((await as(U.journalist2, () => rows('select id from public.article_versions where id = $1', [currentVersion]))).length, 0,
    'another creating journalist cannot read its private version');
  assert.equal((await as(U.publisher, () => rows('select id from public.articles where id = $1', [id]))).length, 1,
    'review/publish staff can read private articles');
  assert.equal((await as(U.publisher, () => rows('select id from public.article_versions where id = $1', [currentVersion]))).length, 1,
    'review/publish staff can read private versions');
  assert.equal((await as(U.m1, () => rows('select id from public.articles where id = $1', [id]))).length, 0,
    'regular members cannot read private articles');
  assert.equal((await as(U.m1, () => rows('select id from public.article_versions where id = $1', [currentVersion]))).length, 0,
    'regular members cannot read private versions');
  assert.equal((await as(null, () => rows('select id from public.articles where id = $1', [id]))).length, 0,
    'anonymous readers cannot read private articles');
  assert.equal((await as(null, () => rows('select id from public.article_versions where id = $1', [currentVersion]))).length, 0,
    'anonymous readers cannot read private versions');

  let revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, revision]));
  const firstPublished = (await rows('select published_version_id from public.articles where id = $1', [id]))[0].published_version_id;
  assert.equal((await as(null, () => rows('select id from public.article_versions where id = $1', [firstPublished]))).length, 1,
    'the exact approved pointer-selected snapshot remains public');

  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.editor, () => db.query(
    'select public.article_revise($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)',
    [id, revision, 'RLS correction fixture', null, '{"type":"doc","content":[]}', authorId, categoryId, null, null, null],
  ));
  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, revision]));
  const secondPublished = (await rows('select published_version_id from public.articles where id = $1', [id]))[0].published_version_id;
  assert.notEqual(secondPublished, firstPublished);
  assert.equal((await as(null, () => rows('select id from public.article_versions where id = $1', [firstPublished]))).length, 0,
    'the formerly approved version is hidden after the publication pointer advances');
  assert.equal((await as(null, () => rows('select id from public.article_versions where id = $1', [secondPublished]))).length, 1,
    'the newly selected approved version is public');

  revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  await db.query("insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.unpublish') on conflict do nothing", [U.publisher]);
  await as(U.publisher, () => db.query('select public.article_unpublish($1, $2)', [id, revision]));
  assert.equal((await as(null, () => rows('select id from public.article_versions where id = $1', [secondPublished]))).length, 0,
    'the approved version is hidden after unpublish clears its article pointer');
  assert.equal((await as(U.publisher, () => rows('select id from public.article_versions where id = $1', [secondPublished]))).length, 1,
    'authorized staff retain read access to the private approved history');
});

test('draft-save rejects an article without a current version and does not record success', async () => {
  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  const id = (await as(U.editor, () => rows(
    `select public.article_create($1, null, '{"type":"doc","content":[]}'::jsonb, $2, $3, null, null, null) as id`,
    ['Missing current-version fixture', authorId, categoryId],
  )))[0].id;

  await db.query('update public.articles set current_version_id = null where id = $1', [id]);
  const revision = (await rows('select revision from public.articles where id = $1', [id]))[0].revision;
  const failure = await asFails(U.editor,
    `select public.article_draft_update('${id}', ${revision}, 'Must not save', null, '{"type":"doc","content":[]}'::jsonb, '${authorId}', '${categoryId}', null, null, null)`);
  assert.match(failure ?? '', /invalid_transition/);
  assert.equal((await rows('select revision from public.articles where id = $1', [id]))[0].revision, revision,
    'a rejected transition does not bump the article revision');
  assert.equal((await rows("select count(*)::int as count from public.audit_events where resource_id = $1 and action = 'article.draft_update'", [id]))[0].count, 0,
    'a rejected transition does not record a success audit event');
});

test('atomic publication and recoverable soft-delete enforce capabilities, audit, rollback, and same-instance revision CAS', async () => {
  const unassignedDelete = (await rows(`select
    (select count(*)::int from public.staff_capability_grants where capability = 'article.delete' and revoked_at is null) as direct_grants,
    (select count(*)::int from public.staff_role_capabilities where capability = 'article.delete') as role_grants`))[0];
  assert.deepEqual(unassignedDelete, { direct_grants: 0, role_grants: 0 },
    'article.delete is not granted directly or through a role by default');

  const categoryId = (await rows("select id from public.categories where slug = 'politics'"))[0].id;
  const authorId = (await rows("select id from public.authors where slug = 'test-byline'"))[0].id;
  await db.query('insert into public.staff_profiles (user_id, is_active) values ($1, true)', [U.atomic]);
  await db.query(
    "insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.create'), ($1, 'article.publish'), ($1, 'article.delete') on conflict do nothing",
    [U.atomic],
  );

  const atomicSql = `select public.article_create_and_publish_with_cover(
    $1, null, '{"type":"doc","content":[]}'::jsonb, $2, $3,
    null, null, null, $4, null, null, null, null, null
  ) as id`;
  const callAtomic = (uid, title, coverUrl = null) => as(uid, async () =>
    (await rows(atomicSql, [title, authorId, categoryId, coverUrl]))[0].id,
  );
  const deniedCreateOnly = await asFails(U.editor,
    `select public.article_create_and_publish_with_cover('Create only denied', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}', null, null, null, null, null, null, null, null, null)`);
  assert.match(deniedCreateOnly ?? '', /capability_required/,
    'article.create alone cannot use the atomic publish operation');
  const deniedPublishOnly = await asFails(U.publisher,
    `select public.article_create_and_publish_with_cover('Publish only denied', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}', null, null, null, null, null, null, null, null, null)`);
  assert.match(deniedPublishOnly ?? '', /capability_required/,
    'article.publish alone cannot use the atomic create operation');
  const invalidCover = await asFails(U.atomic,
    `select public.article_create_and_publish_with_cover('Invalid cover denied', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}', null, null, null, 'http://invalid.example/cover.jpg', null, null, null, null, null)`);
  assert.match(invalidCover ?? '', /invalid_news_cover_metadata/);
  assert.equal((await rows(`select count(*)::int as count from public.article_versions
    where title in ('Create only denied','Publish only denied','Invalid cover denied')`))[0].count, 0,
  'permission and validation failures create no partial draft');

  const atomicFailureTitle = 'Synthetic atomic publish audit failure';
  await db.exec(`
    create function public.test_fail_article_publish_audit() returns trigger
      language plpgsql set search_path = '' as $$
      begin
        if new.action = 'article.publish' then
          raise exception using errcode = 'P0001', message = 'synthetic_publish_audit_failure';
        end if;
        return new;
      end;
      $$;
    create trigger test_fail_article_publish_audit
      before insert on public.audit_events
      for each row execute function public.test_fail_article_publish_audit();
  `);
  let atomicAuditFailure;
  try {
    atomicAuditFailure = await asFails(U.atomic,
      `select public.article_create_and_publish_with_cover('${atomicFailureTitle}', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}', null, null, null, null, null, null, null, null, null)`);
  } finally {
    await db.exec('drop trigger test_fail_article_publish_audit on public.audit_events; drop function public.test_fail_article_publish_audit();');
  }
  assert.match(atomicAuditFailure ?? '', /synthetic_publish_audit_failure/);
  assert.equal((await rows(`select count(*)::int as count from public.article_versions where title = $1`, [atomicFailureTitle]))[0].count, 0,
    'a failed publish audit rolls back the article, version, and create audit together');

  const articleId = await callAtomic(U.atomic, 'Synthetic atomic publish success');
  const published = (await rows(`select a.revision, a.current_version_id, a.published_version_id,
      a.deleted_at, v.state
    from public.articles a join public.article_versions v on v.id = a.published_version_id
    where a.id = $1`, [articleId]))[0];
  assert.deepEqual(published, {
    revision: 2,
    current_version_id: published.published_version_id,
    published_version_id: published.published_version_id,
    deleted_at: null,
    state: 'approved',
  }, 'create and publish commit as one state transition with the production approved-version model');
  assert.deepEqual((await rows(`select action from public.audit_events
    where resource_id = $1 and action in ('article.create','article.publish') order by id`, [articleId])).map(({ action }) => action),
  ['article.create', 'article.publish'], 'both capabilities’ operations have durable audit events');
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [articleId]))).length, 1,
    'the atomic operation is publicly visible only after its publish transaction succeeds');

  const initialRevision = published.revision;
  const deniedDelete = await asFails(U.editor,
    `select public.article_soft_delete('${articleId}', ${initialRevision})`);
  assert.match(deniedDelete ?? '', /capability_required/);
  const missingUnpublish = await asFails(U.atomic,
    `select public.article_soft_delete('${articleId}', ${initialRevision})`);
  assert.match(missingUnpublish ?? '', /capability_required/,
    'deleting a live article also requires explicit takedown permission');
  const staleDelete = await asFails(U.atomic,
    `select public.article_soft_delete('${articleId}', ${initialRevision - 1})`);
  assert.match(staleDelete ?? '', /revision_conflict/);

  await db.query(
    "insert into public.staff_capability_grants (user_id, capability) values ($1, 'article.unpublish') on conflict do nothing",
    [U.atomic],
  );
  await db.exec(`
    create function public.test_fail_article_soft_delete_audit() returns trigger
      language plpgsql set search_path = '' as $$
      begin
        if new.action = 'article.soft_delete' then
          raise exception using errcode = 'P0001', message = 'synthetic_soft_delete_audit_failure';
        end if;
        return new;
      end;
      $$;
    create trigger test_fail_article_soft_delete_audit
      before insert on public.audit_events
      for each row execute function public.test_fail_article_soft_delete_audit();
  `);
  let deleteAuditFailure;
  try {
    deleteAuditFailure = await asFails(U.atomic,
      `select public.article_soft_delete('${articleId}', ${initialRevision})`);
  } finally {
    await db.exec('drop trigger test_fail_article_soft_delete_audit on public.audit_events; drop function public.test_fail_article_soft_delete_audit();');
  }
  assert.match(deleteAuditFailure ?? '', /synthetic_soft_delete_audit_failure/);
  const afterFailedDelete = (await rows('select revision, published_version_id, deleted_at from public.articles where id = $1', [articleId]))[0];
  assert.equal(afterFailedDelete.revision, initialRevision);
  assert.ok(afterFailedDelete.published_version_id);
  assert.equal(afterFailedDelete.deleted_at, null,
    'a failed deletion audit rolls back the pointer and tombstone');

  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [U.atomic]);
  await db.exec('set role authenticated');
  let duplicateDeletes;
  try {
    // PGlite 0.5.14 exposes one embedded instance per db, without a connect/pool
    // API. Promise.all here exercises same-instance expected-revision CAS, not a
    // two-session FOR UPDATE row-lock race. The opt-in PostgreSQL test covers that
    // race against the real migrations using two independently observed backends.
    duplicateDeletes = await Promise.allSettled([
      db.query('select public.article_soft_delete($1, $2)', [articleId, initialRevision]),
      db.query('select public.article_soft_delete($1, $2)', [articleId, initialRevision]),
    ]);
  } finally {
    await db.exec('reset role');
  }
  assert.equal(duplicateDeletes.filter(({ status }) => status === 'fulfilled').length, 1,
    'only one competing delete can commit at the same expected revision');
  const conflict = duplicateDeletes.find(({ status }) => status === 'rejected')?.reason;
  assert.match(conflict?.message ?? '', /revision_conflict/);

  const deleted = (await rows('select revision, current_version_id, published_version_id, deleted_at from public.articles where id = $1', [articleId]))[0];
  assert.equal(deleted.revision, initialRevision + 1);
  assert.equal(deleted.published_version_id, null);
  assert.ok(deleted.deleted_at);
  assert.equal((await rows('select count(*)::int as count from public.article_versions where article_id = $1', [articleId]))[0].count, 1,
    'soft-delete retains immutable version history');
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [articleId]))).length, 0,
    'the public view excludes a deleted article');
  assert.equal((await rows("select count(*)::int as count from public.audit_events where resource_id = $1 and action = 'article.soft_delete'", [articleId]))[0].count, 1);
  assert.match(await asFails(U.atomic,
    `select public.article_publish('${articleId}', ${deleted.revision})`), /article_deleted/,
  'an older publish RPC cannot republish a deleted article');
  assert.match(await asFails(U.atomic,
    `select public.article_revise('${articleId}', ${deleted.revision}, 'Blocked edit', null, '{"type":"doc"}'::jsonb, '${authorId}', '${categoryId}', null, null, null)`),
  /article_deleted/, 'an older edit RPC cannot mutate a deleted article');
  assert.equal((await rows('select count(*)::int as count from public.article_versions where article_id = $1', [articleId]))[0].count, 1,
    'a rejected post-delete edit leaves history unchanged');

  const restoredRevision = (await as(U.atomic, () => rows(
    'select public.article_restore($1, $2) as revision', [articleId, deleted.revision],
  )))[0].revision;
  assert.equal(restoredRevision, deleted.revision + 1);
  const restored = (await rows('select revision, published_version_id, deleted_at from public.articles where id = $1', [articleId]))[0];
  assert.equal(restored.revision, restoredRevision);
  assert.equal(restored.published_version_id, null,
    'restore is recoverable but never silently republishes');
  assert.equal(restored.deleted_at, null);
  assert.equal((await as(null, () => rows('select id from public.published_articles where id = $1', [articleId]))).length, 0);
  assert.deepEqual((await rows(`select action from public.audit_events where resource_id = $1
    and action in ('article.create','article.publish','article.soft_delete','article.restore') order by id`, [articleId])).map(({ action }) => action),
  ['article.create', 'article.publish', 'article.soft_delete', 'article.restore']);

  const newRpcPrivileges = await rows(`
    select p.proname, p.prosecdef, p.proconfig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('article_create_and_publish_with_cover','article_soft_delete','article_restore')
    order by p.proname limit 5
  `);
  assert.equal(newRpcPrivileges.length, 3);
  for (const procedure of newRpcPrivileges) {
    assert.equal(procedure.prosecdef, true);
    assert.ok((procedure.proconfig ?? []).some((setting) => setting.includes('search_path=""')));
    assert.equal(procedure.anon_execute, false);
    assert.equal(procedure.authenticated_execute, true);
  }
});

test('Newsroom RPC privileges are restricted to verified authenticated staff actions', async () => {
  const procedures = await rows(`
    select p.proname, p.prosecdef, p.proconfig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('article_create','article_draft_update','article_revise','article_submit','article_publish','article_unpublish')
    order by p.proname
    limit 20
  `);
  assert.equal(procedures.length, 6);
  for (const procedure of procedures) {
    assert.equal(procedure.prosecdef, true, `${procedure.proname} runs with its constrained owner privileges`);
    assert.ok((procedure.proconfig ?? []).some((setting) => setting.includes('search_path=""')),
      `${procedure.proname} pins search_path`);
    assert.equal(procedure.anon_execute, false, `${procedure.proname} is not executable by anon`);
    assert.equal(procedure.authenticated_execute, true, `${procedure.proname} is executable by authenticated`);
  }
  const legacyReview = (await rows(`
    select has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'article_review'
    limit 1
  `))[0];
  assert.equal(legacyReview.anon_execute, false);
  assert.equal(legacyReview.authenticated_execute, false,
    'the stale, incompatible review RPC is disabled until a versioned review flow exists');
  const anonymousCreate = await asFails(null,
    `select public.article_create('Anon fixture', null, '{"type":"doc"}'::jsonb, '${U.editor}', '${U.editor}', null, null, null)`);
  assert.match(anonymousCreate ?? '', /permission denied/i);
});
