import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const RUN_POSTGRES = process.env.EPE_LAWA_RUN_PG_CONCURRENCY === '1';
const TEST_DATABASE = 'epe_lawa_pr118_test';
const STAFF_ID = '88888888-8888-4888-8888-888888888888';
const MIGRATIONS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
);

const psqlArgs = [
  '-X',
  '--quiet',
  '--tuples-only',
  '--no-align',
  '--set',
  'ON_ERROR_STOP=1',
];

function psql(sql, appName = 'pr118-fixture') {
  const result = spawnSync('psql', psqlArgs, {
    input: sql,
    encoding: 'utf8',
    env: { ...process.env, PGAPPNAME: appName },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `psql (${appName}) exited ${result.status ?? result.signal}:\n${result.stderr}\n${result.stdout}`,
    );
  }
  return result.stdout.trim();
}

function scalar(sql, appName) {
  const output = psql(sql, appName);
  const lines = output.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `Expected one scalar result, received: ${output}`);
  return lines[0];
}

function startPsql(appName) {
  const child = spawn('psql', psqlArgs, {
    env: { ...process.env, PGAPPNAME: appName },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8').on('data', (chunk) => { output.stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { output.stderr += chunk; });
  const closed = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal, ...output }));
  });
  return {
    child,
    closed,
    get stdout() { return output.stdout; },
    get stderr() { return output.stderr; },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForActivity(appName, predicateSql, description, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = scalar(
      `select exists (
         select 1 from pg_catalog.pg_stat_activity
         where datname = current_database()
           and application_name = '${appName}'
           and ${predicateSql}
       )::text`,
      'pr118-observer',
    );
    if (found === 'true') return;
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${description} (application_name=${appName})`);
}

function killIfRunning(child) {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
  }
}

async function runRace({ label, articleId, revision, winner, loser }) {
  const suffix = `${process.pid}-${label}`;
  const holderName = `pr118-holder-${suffix}`;
  const waiterName = `pr118-waiter-${suffix}`;
  const holder = startPsql(holderName);
  let waiter;

  try {
    holder.child.stdin.write(
      `SET request.jwt.claim.sub = '${STAFF_ID}';\n` +
      `SET ROLE authenticated;\n` +
      `BEGIN;\n` +
      `SELECT public.${winner}('${articleId}'::uuid, ${revision}::bigint);\n`,
    );

    try {
      await waitForActivity(
        holderName,
        "state = 'idle in transaction' and xact_start is not null",
        `${winner} to finish while retaining its row lock`,
      );
    } catch (error) {
      const sessions = scalar(`select coalesce(json_agg(json_build_object(
        'application_name', application_name,
        'state', state,
        'wait_event_type', wait_event_type,
        'wait_event', wait_event,
        'query', query
      ))::text, '[]') from pg_catalog.pg_stat_activity
      where datname = current_database() and application_name like 'pr118-%'`, 'pr118-diagnostic');
      throw new Error(
        `${error.message}\nHolder exit=${holder.child.exitCode ?? holder.child.signalCode}` +
        `\nactivity: ${sessions}\nstdout:\n${holder.stdout}\nstderr:\n${holder.stderr}`,
        { cause: error },
      );
    }

    waiter = startPsql(waiterName);
    waiter.child.stdin.end(
      `SET request.jwt.claim.sub = '${STAFF_ID}';\n` +
      `SET ROLE authenticated;\n` +
      `SELECT public.${loser}('${articleId}'::uuid, ${revision}::bigint);\n`,
    );

    await waitForActivity(
      waiterName,
      "state = 'active' and wait_event_type = 'Lock'",
      `${loser} in a PostgreSQL lock wait behind ${winner}`,
    );

    holder.child.stdin.write('COMMIT;\n\\q\n');
    holder.child.stdin.end();

    const [holderResult, waiterResult] = await Promise.all([holder.closed, waiter.closed]);
    assert.equal(holderResult.code, 0, `${winner} holder failed: ${holderResult.stderr}`);
    assert.equal(waiterResult.code, 3, `${loser} should reject its stale revision`);
    assert.match(
      `${waiterResult.stderr}\n${waiterResult.stdout}`,
      /revision_conflict/,
      `${loser} must fail with the real SQL revision guard`,
    );
  } finally {
    killIfRunning(holder.child);
    killIfRunning(waiter?.child);
  }
}

test('PR #118 article publish/delete guards serialize across two PostgreSQL sessions', {
  skip: RUN_POSTGRES ? false : 'Run via backend/tests/run-article-revision-concurrency-postgres.sh',
}, async () => {
  assert.equal(process.env.PGDATABASE, TEST_DATABASE,
    'refusing to run outside the dedicated ephemeral test database');
  assert.match(process.env.PGHOST ?? '', /^\/tmp\/epe-lawa-pr118-pg\.[^/]+\/socket$/,
    'refusing to run without the private Unix socket created by the fixture runner');

  assert.equal(
    scalar(`select count(*) from pg_catalog.pg_class
      where relnamespace = 'public'::regnamespace and relkind in ('r','p','v','m','S','f')`),
    '0',
    'fixture database must have no existing public tables, views, or sequences',
  );
  assert.equal(
    scalar(`select count(*) from pg_catalog.pg_roles
      where rolname in ('anon','authenticated','service_role')`),
    '0',
    'fixture database must not already contain Supabase roles',
  );

  const supabaseSurface = `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `;
  psql(supabaseSurface, 'pr118-bootstrap');

  const migrationFiles = (await readdir(MIGRATIONS))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    try {
      psql(await readFile(path.join(MIGRATIONS, file), 'utf8'), `pr118-migration`);
    } catch (error) {
      throw new Error(`Real PostgreSQL migration ${file} failed: ${error.message}`);
    }
  }

  // The existing schema test documents this production parity shim: production has no
  // article_versions_guard trigger, although the historical migration chain creates one.
  // Drop only that trigger in this disposable fixture so valid production publish RPCs behave
  // as deployed; the PR #118 migration and all other migrations are applied unmodified.
  psql('drop trigger if exists article_versions_guard on public.article_versions;', 'pr118-prod-parity');

  psql(`
    insert into auth.users (id, email, email_confirmed_at)
    values ('${STAFF_ID}', 'pr118-concurrency@example.invalid', now());
    insert into public.staff_profiles (user_id, is_active)
    values ('${STAFF_ID}', true);
    insert into public.staff_capability_grants (user_id, capability) values
      ('${STAFF_ID}', 'article.create'),
      ('${STAFF_ID}', 'article.publish'),
      ('${STAFF_ID}', 'article.delete'),
      ('${STAFF_ID}', 'article.unpublish');
    insert into public.authors (display_name, slug)
    values ('PR118 concurrency fixture', 'pr118-concurrency-fixture');
  `, 'pr118-seed');

  const authorId = scalar(
    "select id from public.authors where slug = 'pr118-concurrency-fixture'",
    'pr118-seed-check',
  );
  const categoryId = scalar(
    "select id from public.categories where slug = 'politics'",
    'pr118-seed-check',
  );
  assert.match(authorId, /^[0-9a-f-]{36}$/i);
  assert.match(categoryId, /^[0-9a-f-]{36}$/i);

  const staffContext = `SET request.jwt.claim.sub = '${STAFF_ID}';\nSET ROLE authenticated;\n`;
  const publishedArticleId = scalar(`${staffContext}
    select public.article_create_and_publish_with_cover(
      'PR118 PostgreSQL published race', null,
      '{"type":"doc","content":[]}'::jsonb,
      '${authorId}'::uuid, '${categoryId}'::uuid,
      null, null, null, null, null, null, null, null, null
    );
  `, 'pr118-create-published');
  const publishedRevision = Number(scalar(
    `select revision from public.articles where id = '${publishedArticleId}'::uuid`,
    'pr118-published-revision',
  ));
  assert.equal(publishedRevision, 2, 'atomic create/publish fixture starts at revision 2');

  const draftArticleId = scalar(`${staffContext}
    select public.article_create(
      'PR118 PostgreSQL draft race', null,
      '{"type":"doc","content":[]}'::jsonb,
      '${authorId}'::uuid, '${categoryId}'::uuid,
      null, null, null
    );
  `, 'pr118-create-draft');
  const draftRevision = Number(scalar(
    `select revision from public.articles where id = '${draftArticleId}'::uuid`,
    'pr118-draft-revision',
  ));
  assert.equal(draftRevision, 1, 'draft fixture starts at revision 1');

  // First lock order: delete owns the article row, then a distinct connection tries to publish
  // with the same expected revision. Assert it is truly waiting on PostgreSQL's lock before commit.
  await runRace({
    label: 'delete-first',
    articleId: publishedArticleId,
    revision: publishedRevision,
    winner: 'article_soft_delete',
    loser: 'article_publish',
  });
  const deletedState = JSON.parse(scalar(`
    select json_build_object(
      'revision', revision,
      'deleted', deleted_at is not null,
      'published', published_version_id is not null
    )::text
    from public.articles where id = '${publishedArticleId}'::uuid
  `, 'pr118-verify-delete'));
  assert.deepEqual(deletedState, {
    revision: publishedRevision + 1,
    deleted: true,
    published: false,
  });
  assert.equal(scalar(`select count(*) from public.audit_events
    where resource_id = '${publishedArticleId}'::uuid and action = 'article.soft_delete'`), '1');
  assert.equal(scalar(`select count(*) from public.audit_events
    where resource_id = '${publishedArticleId}'::uuid and action = 'article.publish'`), '1',
  'the waiting stale publish records no second publish audit');
  assert.equal(scalar(`select count(*) from public.published_articles
    where id = '${publishedArticleId}'::uuid`), '0', 'deleted article is absent from the public view');

  // Reverse lock order: publish owns a draft row; delete waits with the same revision and must
  // conflict after publish commits, leaving a live published article and no delete audit.
  await runRace({
    label: 'publish-first',
    articleId: draftArticleId,
    revision: draftRevision,
    winner: 'article_publish',
    loser: 'article_soft_delete',
  });
  const publishedState = JSON.parse(scalar(`
    select json_build_object(
      'revision', revision,
      'deleted', deleted_at is not null,
      'published', published_version_id is not null
    )::text
    from public.articles where id = '${draftArticleId}'::uuid
  `, 'pr118-verify-publish'));
  assert.deepEqual(publishedState, {
    revision: draftRevision + 1,
    deleted: false,
    published: true,
  });
  assert.equal(scalar(`select count(*) from public.audit_events
    where resource_id = '${draftArticleId}'::uuid and action = 'article.publish'`), '1');
  assert.equal(scalar(`select count(*) from public.audit_events
    where resource_id = '${draftArticleId}'::uuid and action = 'article.soft_delete'`), '0',
  'the waiting stale delete records no soft-delete audit');
  assert.equal(scalar(`select count(*) from public.published_articles
    where id = '${draftArticleId}'::uuid`), '1', 'published article remains in the public view');
});
