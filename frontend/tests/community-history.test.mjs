import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const migrationPath = new URL('../../backend/supabase/migrations/20261107202500_community_history.sql', import.meta.url);
const pagePath = new URL('../apps/main/app/itan-ilu-mi/page.tsx', import.meta.url);
const actionPath = new URL('../apps/main/app/itan-ilu-mi/actions.ts', import.meta.url);

test('history migration separates private contributions from public records and enforces RLS', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /create table public\.history_records/);
  assert.match(sql, /create table public\.history_record_sources/);
  assert.match(sql, /create table public\.history_contributions/);
  assert.match(sql, /contributor_id uuid not null references public\.profiles/);
  assert.match(sql, /consent_version text not null/);
  assert.match(sql, /consent_text text not null/);
  assert.match(sql, /consented_at timestamptz not null/);
  assert.match(sql, /alter table public\.history_contributions enable row level security/);
  assert.match(sql, /history_contributions_insert_member[\s\S]*?is_member_active\(\)[\s\S]*?is_member_banned\(\)/);
  assert.match(sql, /history_contributions_read_staff[\s\S]*?has_capability\('history\.review'\)/);
  assert.match(sql, /grant select \(id, title, account, published_at\) on public\.history_records/);
  assert.match(sql, /revoke all on public\.history_records, public\.history_record_sources, public\.history_contributions from public, anon, authenticated/);
  assert.match(sql, /There is deliberately no client write privilege\/policy for public records/);
  assert.doesNotMatch(sql, /insert into public\.history_records\s*\(/i);
});

test('history page reads bounded public records and keeps empty/error states distinct', async () => {
  const page = await readFile(pagePath, 'utf8');
  // Turn 4: approved records may carry a staff-approved image.
  assert.match(page, /from\("history_records"\)\.select\("id,title,account,published_at,community,category,family_name,lineage_description,image_key,image_alt"\)/);
  assert.match(page, /\.range\(offset, offset \+ PAGE_SIZE\)/);
  assert.match(page, /aria-label="History pagination"/);
  assert.match(page, /No approved history records yet/);
  assert.match(page, /History records could not be loaded/);
  assert.match(page, /Submissions, photos and evidence stay private/);
  assert.match(page, /Sources/);
  assert.doesNotMatch(page, /SERVICE_ROLE|service_role/i);
});

test('history contribution action authenticates, validates consent, and persists no public content directly', async () => {
  const action = await readFile(actionPath, 'utf8');
  // Turn 4 owner brief: signing in is optional; the member or guest is resolved server-side.
  assert.match(action, /resolvePublicSubmitter\(formData\)/);
  assert.match(action, /formData\.get\("consent"\) !== "yes"/);
  assert.match(action, /consent_version: CONSENT_VERSION/);
  assert.match(action, /consent_text: HISTORY_CONSENT_TEXT/);
  assert.match(action, /contributor_id: submitter\.memberId/);
  assert.match(action, /from\("history_contributions"\)\.insert/);
  assert.doesNotMatch(action, /from\("history_records"\)/);
  assert.doesNotMatch(action, /SERVICE_ROLE|service_role/i);
});


// Turn 3 brief: corrections move to their own page; the archive page links to it (per record since turn 5).
// Turn 4 brief: requests go to their own private staff queue (history_correction_requests), not enquiries.
test('published-history correction and removal requests use their own private staff queue', async () => {
  const archive = await readFile(pagePath, 'utf8');
  // Turn 5 brief: the standalone "Fix the record" section was removed from the archive page;
  // every published record still links to the correction page with its title prefilled.
  assert.doesNotMatch(archive, /Fix the record|history-corrections/);
  assert.match(archive, /href=\{`\/itan-ilu-mi\/correction\?record=\$\{encodeURIComponent\(record\.title\)\}`\}/);
  const page = await readFile(new URL('../apps/main/app/itan-ilu-mi/correction/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Correction and removal requests/);
  assert.match(page, /<CorrectionForm /);
  const correctionAction = await readFile(new URL('../apps/main/app/itan-ilu-mi/correction/actions.ts', import.meta.url), 'utf8');
  assert.match(correctionAction, /from\("history_correction_requests"\)\.insert/);
  assert.match(page, /never published/);
  assert.doesNotMatch(page, /Coming\s+Soon/i);
  assert.doesNotMatch(page, /not configured/i);
  assert.doesNotMatch(page, /do not enter correction details as a new contribution/i);
});
