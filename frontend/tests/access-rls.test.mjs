import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('staff-access migration defaults to deny and isolates user grants in ephemeral Postgres', async () => {
  // In-memory synthetic identities only. This simulates Supabase roles/auth.uid(), not a real Supabase project.
  const db = new PGlite();
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const nonStaff = '33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
        as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    const migration = await readFile(new URL('../../backend/supabase/migrations/20261102130000_staff_access_foundation.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    assert.equal((await db.query('select count(*)::int as count from public.staff_profiles')).rows[0].count, 0);
    assert.equal((await db.query('select count(*)::int as count from public.staff_capability_grants')).rows[0].count, 0);

    await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [first, second, nonStaff]);
    await db.query('insert into public.staff_profiles (user_id, is_active) values ($1, true), ($2, false)', [first, second]);
    await db.query("insert into public.staff_capability_grants (user_id, capability) values ($1, 'admin.access'), ($2, 'admin.access')", [first, second]);
    await assert.rejects(db.query("insert into public.staff_capability_grants (user_id, capability) values ($1, 'staff.manage')", [first]), /check constraint/i);

    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.staff_profiles'), /permission denied/i);
    await assert.rejects(db.query('select * from public.staff_capability_grants'), /permission denied/i);
    await db.exec('reset role');

    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [first]);
    assert.deepEqual((await db.query('select user_id::text from public.staff_profiles')).rows, [{ user_id: first }]);
    assert.deepEqual((await db.query('select capability from public.staff_capability_grants')).rows, [{ capability: 'admin.access' }]);
    assert.equal((await db.query('select * from public.staff_capability_grants where user_id = $1', [second])).rows.length, 0);
    await assert.rejects(db.query('update public.staff_profiles set is_active = true'), /permission denied/i);
    await assert.rejects(db.query("insert into public.staff_capability_grants (user_id, capability) values ($1, 'admin.access')", [second]), /permission denied/i);
    await assert.rejects(db.query('delete from public.staff_capability_grants'), /permission denied/i);

    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [second]);
    assert.equal((await db.query('select * from public.staff_capability_grants')).rows.length, 0, 'inactive account cannot read its grant');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [nonStaff]);
    assert.equal((await db.query('select * from public.staff_profiles')).rows.length, 0, 'an authenticated non-staff user has no profile');
    assert.equal((await db.query('select * from public.staff_capability_grants')).rows.length, 0, 'an authenticated non-staff user has no grant');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", ['']);
    assert.equal((await db.query('select * from public.staff_profiles')).rows.length, 0, 'no identity is not staff');
    await db.exec('reset role');

    await db.query('update public.staff_profiles set is_active = false where user_id = $1', [first]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [first]);
    assert.equal((await db.query('select * from public.staff_capability_grants')).rows.length, 0, 'revocation takes effect on next query');
  } finally {
    await db.close();
  }
});
