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
 * The Supabase surface the migrations legitimately depend on: the two request roles, auth.users,
 * and auth.uid() reading the JWT subject claim. Recreated here exactly as Supabase defines them.
 */
const SUPABASE_SURFACE = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
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
  if (uid) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
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
  editor: '11111111-1111-4111-8111-111111111111',
  journalist2: '22222222-2222-4222-8222-222222222222',
  publisher: '33333333-3333-4333-8333-333333333333',
  m1: '44444444-4444-4444-8444-444444444444',
  m2: '55555555-5555-4555-8555-555555555555',
};

for (const id of Object.values(U)) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
}

// Staff accounts are provisioned out of band in production. The test creates them directly as the
// table owner, which is the only role with insert rights on staff_profiles and the grants table.
await db.exec(`
  insert into public.staff_profiles (user_id, is_active) values
    ('${U.editor}', true),
    ('${U.journalist2}', true),
    ('${U.publisher}', true);

  insert into public.staff_capability_grants (user_id, capability) values
    ('${U.editor}', 'article.create'),
    ('${U.editor}', 'people.manage'),
    ('${U.journalist2}', 'article.create'),
    ('${U.publisher}', 'article.review'),
    ('${U.publisher}', 'article.publish'),
    ('${U.publisher}', 'business.review'),
    ('${U.publisher}', 'audit.read'),
    ('${U.publisher}', 'moderation.review'),
    ('${U.publisher}', 'order.manage');

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

  let r = await revision();
  await as(U.editor, () => db.query('select public.article_submit($1, $2)', [id, r]));
  r = await revision();
  await as(U.publisher, () =>
    db.query("select public.article_review($1, 'approve', $2, null)", [id, r]),
  );
  r = await revision();
  await as(U.publisher, () => db.query('select public.article_publish($1, $2)', [id, r]));
  return id;
}

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

  // Approving is not publishing: an approved snapshot with no published pointer stays private.
  const revision = async () =>
    (await rows('select revision from public.articles where id = $1', [articleId]))[0].revision;

  const rSubmit = await revision();
  await as(U.editor, () => db.query('select public.article_submit($1, $2)', [articleId, rSubmit]));

  const selfReview = await asFails(
    U.editor,
    `select public.article_review('${articleId}', 'approve', ${rSubmit}, null)`,
  );
  assert.match(selfReview ?? '', /capability_required/, 'a journalist cannot approve their own work');

  const rReview = await revision();
  await as(U.publisher, () =>
    db.query('select public.article_review($1, $2, $3, null)', [articleId, 'approve', rReview]),
  );
  assert.equal((await as(null, () => rows('select id from public.articles'))).length, 0,
    'approved but unpublished must stay invisible to anon');

  const rPublish = await revision();
  await as(U.publisher, () =>
    db.query('select public.article_publish($1, $2)', [articleId, rPublish]),
  );
  assert.equal((await as(null, () => rows('select slug from public.published_articles'))).length, 1,
    'a published article must reach anon');

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

test('an approved article snapshot cannot be edited or deleted', async () => {
  const version = (await rows("select id from public.article_versions limit 1"))[0].id;
  const edited = await fails(`update public.article_versions set title = 'changed' where id = '${version}'`);
  assert.match(edited ?? '', /approved_version_immutable/, 'approved text must be immutable');

  const deleted = await fails(`delete from public.article_versions where id = '${version}'`);
  assert.match(deleted ?? '', /immutable/, 'version history must not be deletable');
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
  const own = await as(U.m1, () => rows('select id from public.comments where author_id = $1', [U.m1]));
  assert.ok(own.length >= 1, 'a banned member keeps read access to their own comments');

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
