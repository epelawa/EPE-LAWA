import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { readSupabasePublicArticle, publicArticleResponse } from '../../backend/packages/editorial/src/supabase-public.ts';

const writer = '11111111-1111-4111-8111-111111111111';
const editor = '22222222-2222-4222-8222-222222222222';
const stranger = '33333333-3333-4333-8333-333333333333';
const article = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const version = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const revised = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const file = (path) => readFile(new URL('../../backend/supabase/' + path, import.meta.url), 'utf8');

test('unwired editorial SQL prototype enforces capabilities, workflow, audit and private tables in ephemeral Postgres', async () => {
  // In-memory synthetic identities and claims only. This is NOT a real Supabase security test.
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;`);
    await db.exec(await file('migrations/20261102133703_staff_access_foundation.sql'));
    await db.exec(await file('proposals/editorial_storage.sql'));
    await db.exec(await file('proposals/editorial_commands.sql'));
    await db.query('insert into auth.users (id) values ($1),($2),($3)', [writer, editor, stranger]);
    await db.query('insert into public.staff_profiles (user_id,is_active) values ($1,true),($2,true)', [writer, editor]);
    await db.query("insert into public.staff_capability_grants (user_id,capability) values ($1,'admin.access'),($2,'admin.access')", [writer,editor]);
    for (const cap of ['draft.create', 'draft.edit.own', 'draft.submit', 'article.approve']) {
      await db.query('insert into public.editorial_capabilities values ($1,$2)', [writer, cap]);
    }
    for (const cap of ['article.review', 'article.approve', 'article.publish', 'article.unpublish']) {
      await db.query('insert into public.editorial_capabilities values ($1,$2)', [editor, cap]);
    }
    const claim = async (id) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    // Local adapter simulation: no actual PostgREST or network. Invoke only under anon role.
    const config = { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_synthetic' };
    const simulatedRest = async (_url, init) => Response.json((await db.query('select * from public.editorial_prototype_public_get($1)', [JSON.parse(init.body).target])).rows);
    const publicResponse = async () => publicArticleResponse(await readSupabasePublicArticle(config, article, simulatedRest));
    const command = (revision, action, extra = []) => db.query('select public.editorial_prototype_command($1,$2,$3,$4,$5,$6,$7) as revision', [article, revision, action, ...[...extra, null, null, null, null].slice(0, 4)]);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await db.exec('set role ' + role);
      for (const table of ['editorial_articles', 'editorial_versions', 'editorial_approvals', 'editorial_audit_events', 'editorial_capabilities']) {
        await assert.rejects(db.query('select * from public.' + table), /permission denied/i);
        await assert.rejects(db.query('delete from public.' + table), /permission denied/i);
      }
      await assert.rejects(db.query("update public.editorial_versions set state='approved'"), /permission denied/i);
      await assert.rejects(db.query("insert into public.editorial_capabilities values ($1,'article.approve')", [stranger]), /permission denied/i);
      await assert.rejects(db.query("select public.editorial_prototype_require_capability($1,'draft.create')", [writer]), /permission denied/i);
      await assert.rejects(db.query('select public.editorial_prototype_require_edit($1)', [writer]), /permission denied/i);
      if (role !== 'authenticated') await assert.rejects(db.query("select public.editorial_prototype_create($1,$2,'Title','','Body')", [article, version]), /permission denied/i);
      await db.exec('reset role');
    }
    await db.exec('set role authenticated');
    await claim(stranger);
    await assert.rejects(db.query("select public.editorial_prototype_create($1,$2,'Title','','Body')", [article, version]), /editorial request denied/i);
    await claim(writer);
    await db.query("select public.editorial_prototype_create($1,$2,'Synthetic title','','Synthetic body')", [article, version]);
    assert.deepEqual((await db.query('select * from public.editorial_prototype_public_get($1)', [article])).rows, [], 'draft has no public projection');
    await assert.rejects(command(1, 'publish'), /editorial request denied/i);
    assert.equal(Number((await command(1, 'submit')).rows[0].revision), 2);
    await assert.rejects(command(1, 'submit'), /editorial request denied/i, 'stale request denied');
    await assert.rejects(command(2, 'approve'), /editorial request denied/i, 'owner cannot self-approve');
    await claim(editor);
    await assert.rejects(command(2, 'edit', [revised, 'Modified', '', 'Text']), /editorial request denied/i);
    assert.equal(Number((await command(2, 'request_revision')).rows[0].revision), 3);
    await claim(writer);
    assert.equal(Number((await command(3, 'submit')).rows[0].revision), 4);
    await claim(editor);
    assert.equal(Number((await command(4, 'approve')).rows[0].revision), 5);
    await db.exec('reset role');
    await db.query("delete from public.editorial_capabilities where user_id=$1 and capability='article.publish'", [editor]);
    await db.exec('set role authenticated'); await claim(editor);
    await assert.rejects(command(5, 'publish'), /editorial request denied/i, 'revoked publish grant prevents an otherwise valid action');
    await db.exec('reset role');
    await db.query("insert into public.editorial_capabilities values ($1,'article.publish')", [editor]);
    await db.exec('set role authenticated'); await claim(editor);
    assert.equal(Number((await command(5, 'publish')).rows[0].revision), 6);
    await db.exec('reset role; set role anon');
    assert.deepEqual((await db.query('select * from public.editorial_prototype_public_get($1)', [article])).rows, [{ title: 'Synthetic title', summary: '', body: 'Synthetic body' }]);
    const publishedHttp = await publicResponse();
    assert.equal(publishedHttp.status, 200); assert.match(publishedHttp.headers.get('cache-control'), /no-store/);
    assert.equal((await publishedHttp.json()).title, 'Synthetic title');
    await db.exec('reset role; set role authenticated');
    await claim(writer);
    assert.equal(Number((await command(6, 'edit', [revised, 'Synthetic revision', '', 'Revised body'])).rows[0].revision), 7);
    await db.exec('reset role');
    assert.equal((await db.query('select published_version_id::text from public.editorial_articles where id=$1', [article])).rows[0].published_version_id, version, 'private edit does not change the published version');
    await db.exec('set role anon');
    assert.deepEqual((await db.query('select * from public.editorial_prototype_public_get($1)', [article])).rows, [{ title: 'Synthetic title', summary: '', body: 'Synthetic body' }], 'public read remains on approved snapshot');
    await db.exec('reset role');
    assert.equal((await db.query('select state from public.editorial_versions where id=$1', [version])).rows[0].state, 'approved');
    await assert.rejects(db.query("update public.editorial_versions set title='Changed' where id=$1", [version]), /immutable/i);
    await assert.rejects(db.query("update public.editorial_versions set state='draft' where id=$1", [version]), /immutable/i);
    await assert.rejects(db.query("update public.editorial_audit_events set action='edit' where article_id=$1 and revision=1", [article]), /append-only/i);
    await assert.rejects(db.query('delete from public.editorial_audit_events where article_id=$1 and revision=1', [article]), /append-only/i);
    await db.query('update public.staff_profiles set is_active=false where user_id=$1', [editor]);
    await db.exec('set role authenticated'); await claim(editor);
    await assert.rejects(command(7, 'unpublish'), /editorial request denied/i, 'inactive staff cannot withdraw an otherwise published article');
    await db.exec('reset role');
    await db.query('update public.staff_profiles set is_active=true where user_id=$1', [editor]);
    await db.query("delete from public.staff_capability_grants where user_id=$1 and capability='admin.access'", [editor]);
    await db.exec('set role authenticated'); await claim(editor);
    await assert.rejects(command(7, 'unpublish'), /editorial request denied/i, 'editorial grants cannot bypass revoked admin entry');
    await db.exec('reset role');
    await db.query("insert into public.staff_capability_grants (user_id,capability) values ($1,'admin.access')", [editor]);
    // A failure when writing audit must roll back the preceding withdrawal and revision.
    await db.exec(`create function public.synthetic_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit failure'; end $$;
      create trigger synthetic_audit_failure before insert on public.editorial_audit_events for each row execute function public.synthetic_audit_failure();`);
    await db.exec('set role authenticated'); await claim(editor);
    await assert.rejects(command(7, 'unpublish'), /synthetic audit failure/i);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select revision::int, published_version_id::text from public.editorial_articles where id=$1', [article])).rows[0], { revision: 7, published_version_id: version });
    await db.exec('drop trigger synthetic_audit_failure on public.editorial_audit_events; drop function public.synthetic_audit_failure()');
    await db.exec('set role authenticated'); await claim(editor);
    assert.equal(Number((await command(7, 'unpublish')).rows[0].revision), 8);
    await db.exec('reset role');
    assert.equal((await db.query('select published_version_id from public.editorial_articles where id=$1', [article])).rows[0].published_version_id, null);
    await db.exec('set role anon');
    assert.deepEqual((await db.query('select * from public.editorial_prototype_public_get($1)', [article])).rows, [], 'withdrawal disappears on next uncached database read');
    const withdrawnHttp = await publicResponse();
    assert.equal(withdrawnHttp.status, 404); assert.match(withdrawnHttp.headers.get('cache-control'), /no-store/);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select revision::int,action from public.editorial_audit_events order by revision')).rows.map(r => [r.revision, r.action]), [[1,'create'],[2,'submit'],[3,'request_revision'],[4,'submit'],[5,'approve'],[6,'publish'],[7,'edit'],[8,'unpublish']]);
    // A correction requires its own review and approval.
    await db.exec('set role authenticated'); await claim(writer);
    assert.equal(Number((await command(8, 'submit')).rows[0].revision), 9);
    await claim(editor);
    assert.equal(Number((await command(9, 'approve')).rows[0].revision), 10);
    assert.equal(Number((await command(10, 'publish')).rows[0].revision), 11);
    await db.exec('reset role; set role anon');
    assert.deepEqual((await db.query('select * from public.editorial_prototype_public_get($1)', [article])).rows, [{ title: 'Synthetic revision', summary: '', body: 'Revised body' }]);
    assert.equal((await (await publicResponse()).json()).title, 'Synthetic revision');
    await db.exec('reset role');
    await db.query("insert into public.editorial_capabilities values ($1,'draft.edit.any'),($1,'draft.submit')", [editor]);
    await db.exec('set role authenticated'); await claim(editor);
    const editorVersion = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    assert.equal(Number((await command(11, 'edit', [editorVersion, 'Editor draft', '', 'Body'])).rows[0].revision), 12);
    assert.equal(Number((await command(12, 'submit')).rows[0].revision), 13);
    await assert.rejects(command(13, 'approve'), /editorial request denied/i, 'latest editor cannot approve their own version');
    await db.exec('reset role');
    const otherArticle = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const otherVersion = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    await db.transaction(async tx => {
      await tx.query('insert into public.editorial_articles (id,owner_id,revision,current_version_id) values ($1,$2,1,$3)', [otherArticle,writer,otherVersion]);
      await tx.query("insert into public.editorial_versions (id,article_id,author_id,title,summary,body,state) values ($1,$2,$3,'Title','','Body','draft')", [otherVersion,otherArticle,writer]);
    });
    await assert.rejects(db.transaction(async tx => { await tx.query('update public.editorial_articles set current_version_id=$1 where id=$2', [otherVersion,article]); }), /foreign key/i, 'cross-article current pointer rejected');
    await assert.rejects(db.transaction(async tx => { await tx.query('update public.editorial_articles set published_version_id=$1 where id=$2', [version,otherArticle]); }), /foreign key/i, 'cross-article approval pointer rejected');
    await assert.rejects(db.transaction(async tx => { await tx.query('update public.editorial_articles set published_version_id=$1 where id=$2', [otherVersion,otherArticle]); }), /foreign key/i, 'unapproved version rejected');
    await assert.rejects(db.query('delete from public.staff_profiles where user_id=$1', [writer]), /foreign key/i, 'identity deletion is restricted until a retention policy is designed');
  } finally { await db.close(); }
});
