import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../../backend/supabase/migrations/20261107234000_history_review_redacted_publish.sql', import.meta.url);
const pagePath = new URL('../apps/admin/app/(protected)/itan-ilu-mi/review/page.tsx', import.meta.url);
const actionPath = new URL('../apps/admin/lib/history-actions.ts', import.meta.url);

test('staff History review keeps private evidence visible only in authorized queue and requires separate approved public text', async () => {
  const [page, action] = await Promise.all([readFile(pagePath, 'utf8'), readFile(actionPath, 'utf8')]);
  assert.match(page, /p_capability: "history\.review"/);
  assert.match(page, /if \(permitted\)[\s\S]*?from\("history_contributions"\)/);
  assert.match(page, /source_description/);
  assert.match(page, /consent_text/);
  assert.match(page, /name="publicAccount"/);
  assert.match(page, /name="publicFamilyName"/);
  assert.match(page, /name="publicLineageDescription"/);
  assert.match(page, /name="publicCitation"/);
  assert.match(page, /name="publicSourceUrl"/);
  assert.match(page, /Only explicitly approved account, family\/lineage and citation fields are public/);
  assert.match(page, /maxLength=\{180\}/);
  assert.match(page, /maxLength=\{5000\}/);
  assert.match(page, /Edited\/redacted public account \(required to publish\)/);
  assert.match(page, /aria-describedby/);
  assert.match(page, /missing_public_text[\s\S]*?role=\{params\.result === "saved" \? "status" : "alert"\}/);
  assert.match(action, /history_contribution_decide/);
  assert.match(action, /p_contribution_id: id/);
  assert.match(action, /p_decision: decision/);
  assert.match(action, /p_public_account:[\s\S]*publicAccount/);
  assert.match(action, /p_public_family_name:[\s\S]*publicFamilyName/);
  assert.match(action, /p_public_lineage_description:[\s\S]*publicLineageDescription/);
  assert.match(action, /p_public_citation:[\s\S]*publicCitation/);
  assert.match(action, /p_public_source_url:[\s\S]*publicSourceUrl/);
  assert.ok(action.includes('!/^https:\\/\\//i.test'));
  assert.match(action, /publicFamilyName\.trim\(\)\s*\?\s*publicFamilyName\.trim\(\)\s*:\s*null/);
  assert.match(action, /decision === "published"[\s\S]*publicAccount\.trim\(\)\.length < 20/);
  assert.doesNotMatch(action, /service_role|SERVICE_ROLE/i);
});

test('History publication accepts only explicit approved text and keeps private evidence out of public record', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /drop function if exists public\.history_contribution_decide\(uuid, text, text, text, text\)/);
  assert.match(sql, /p_public_account text/);
  assert.match(sql, /p_public_family_name text/);
  assert.match(sql, /p_public_lineage_description text/);
  assert.match(sql, /p_public_citation text/);
  assert.match(sql, /p_public_source_url text/);
  assert.match(sql, /char_length\(btrim\(p_public_citation\)\) not between 3 and 1000/);
  assert.match(sql, /btrim\(p_public_source_url\) !~\* '\^https:\/\//);
  assert.match(sql, /char_length\(btrim\(p_public_account\)\) not between 20 and 20000/);
  assert.match(sql, /char_length\(btrim\(p_public_family_name\)\) > 180/);
  assert.match(sql, /char_length\(btrim\(p_public_lineage_description\)\) > 5000/);
  assert.match(sql, /insert into public\.history_records[\s\S]*?p_public_account[\s\S]*?p_public_family_name[\s\S]*?p_public_lineage_description/);
  assert.match(sql, /insert into public\.history_record_sources[\s\S]*?p_public_citation[\s\S]*?p_public_source_url/);
  assert.doesNotMatch(sql, /values\s*\([^;]*v_contribution\.account/s);
  assert.doesNotMatch(sql, /v_contribution\.(?:source_description|source_url|rights_description|consent_text)/);
  assert.match(sql, /v_contribution\.community[\s\S]*v_contribution\.category/);
  assert.doesNotMatch(sql, /v_contribution\.(?:family_name|lineage_description)/);
  assert.match(sql, /for update/);
  assert.match(sql, /v_contribution\.status <> 'pending'/);
  assert.match(sql, /history_contribution_already_reviewed/);
  assert.match(sql, /grant execute on function public\.history_contribution_decide\(uuid, text, text, text, text, text, text\) to authenticated/);
});


test('staff History queue clearly blocks unavailable published-record corrections and removals', async () => {
  const page = await readFile(pagePath, 'utf8');
  assert.match(page, /<StatusBadge tone="warning">Unavailable<\/StatusBadge>/);
  assert.match(page, /Published-record corrections and removals/);
  assert.match(page, /This queue accepts new contributions only/);
  assert.match(page, /cannot receive correction\/removal reports or edit or withdraw a published record/);
  assert.match(page, /No safe, persisted correction workflow is available/);
  assert.doesNotMatch(page, /Coming\s+Soon/i);
});
