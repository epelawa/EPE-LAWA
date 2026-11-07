import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const migration = await readFile(new URL('../../backend/supabase/migrations/20261107214000_itan_ilu_mi_categorization_lineage.sql', import.meta.url), 'utf8');
const page = await readFile(new URL('../apps/main/app/itan-ilu-mi/page.tsx', import.meta.url), 'utf8');
const action = await readFile(new URL('../apps/main/app/itan-ilu-mi/actions.ts', import.meta.url), 'utf8');
const review = await readFile(new URL('../apps/admin/app/(protected)/itan-ilu-mi/review/page.tsx', import.meta.url), 'utf8');

test('Itan Ilu Mi schema adds constrained community, category, lineage and rights metadata', () => {
  for (const name of ['community', 'category', 'family_name', 'lineage_description', 'rights_description']) {
    assert.match(migration, new RegExp(`add column ${name} `));
  }
  assert.match(migration, /history_records_category check/);
  assert.match(migration, /history_contributions_category check/);
  assert.match(migration, /history_contributions_consent[\s\S]*history-intake-v1[\s\S]*history-intake-v2/);
  assert.match(migration, /history_contribution_decide/);
  assert.match(migration, /audit_event/);
  assert.match(migration, /v_contribution\.rights_description/);
  assert.doesNotMatch(migration, /service_role/i);
});

test('public browsing only queries published archive table and supports family/community/category search', () => {
  assert.match(page, /from\("history_records"\)/);
  assert.match(page, /family_name\.ilike/);
  assert.match(page, /community\.ilike/);
  assert.match(page, /\.eq\("category", category\)/);
  assert.match(page, /Published accounts/);
  assert.match(page, /family_name/);
  assert.match(page, /lineage_description/);
  assert.match(page, /Images and video are not currently accepted/);
  assert.match(page, /storage provider is configured/);
  assert.doesNotMatch(page, /SERVICE_ROLE|service_role/i);
});

test('intake validates provenance, rights, category and consent before private insert', () => {
  assert.match(action, /categories\.includes/);
  assert.match(action, /rightsDescription\.length < 5/);
  assert.match(action, /formData\.get\("consent"\) !== "yes"/);
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.match(action, /from\("history_contributions"\)\.insert/);
  assert.match(action, /rights_description: rightsDescription/);
  assert.doesNotMatch(action, /from\("history_records"\)/);
  assert.doesNotMatch(action, /media_url|image_url|video_url|service_role/i);
});

test('staff review sees rights and lineage evidence and retains explicit decision controls', () => {
  assert.match(review, /\.eq\("status", "pending"\)/);
  assert.match(review, /rights_description/);
  assert.match(review, /Publication rights evidence/);
  assert.match(review, /Lineage context/);
  assert.match(review, /Publish verified record/);
  assert.match(review, /Request revision/);
  assert.match(review, /Reject/);
});
