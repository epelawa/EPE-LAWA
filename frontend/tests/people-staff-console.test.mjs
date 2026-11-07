import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const page = await readFile(new URL('frontend/apps/admin/app/(protected)/people/page.tsx', root), 'utf8');
const actions = await readFile(new URL('frontend/apps/admin/app/(protected)/people/actions.ts', root), 'utf8');
const migration = await readFile(new URL('backend/supabase/migrations/20261107222000_people_staff_console.sql', root), 'utf8');

test('staff directory fails closed without people.manage and omits contributor identity/consent', () => {
  assert.match(page, /staff_capability_grants/);
  assert.match(page, /people\.manage/);
  assert.match(page, /No records are shown/);
  assert.doesNotMatch(page, /contributor_name|contributor_consent_recorded_at|submitted_email|submitted_by/);
});

test('staff actions use capability-checked RPCs and no direct table writes', () => {
  for (const rpc of [
    'people_create',
    'people_update',
    'people_update_achievements',
    'people_source_add',
    'people_source_set_visibility',
    'people_office_add',
    'people_set_status',
    'people_verify',
    'people_unverify',
    'people_correction_resolve',
  ]) {
    assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.doesNotMatch(actions, /\.from\([^)]*\)\.(insert|update|upsert|delete)/);
});

test('achievement/source/office/correction RPCs enforce capability, audit and source ownership', () => {
  assert.equal((migration.match(/perform public\.require_capability\('people\.manage'\)/g) || []).length, 5);
  assert.match(migration, /people_update_achievements[\s\S]*?revision_conflict/);
  assert.match(migration, /people\.update_achievements/);
  assert.match(migration, /source_not_for_person/);
  assert.match(migration, /people\.source_visibility/);
  assert.match(migration, /people\.office_add/);
  assert.match(migration, /people\.correction_resolve/);
  assert.match(migration, /revoke all on function public\.people_update_achievements/);
  assert.match(migration, /grant execute on function public\.people_update_achievements/);
});

test('publishing and verification require database RPCs with revision/source/reviewer evidence', () => {
  assert.match(actions, /rpc\("people_set_status"/);
  assert.match(actions, /rpc\("people_verify"/);
  assert.match(actions, /p_expected_revision: revision/);
  assert.match(actions, /p_source_id: sourceId/);
  assert.match(actions, /p_note: note/);
});
