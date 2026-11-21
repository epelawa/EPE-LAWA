import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actionPage = new URL('../apps/admin/app/(protected)/media/page.tsx', import.meta.url);
const actions = new URL('../apps/admin/app/(protected)/media/media-actions.ts', import.meta.url);
const r2 = new URL('../apps/admin/lib/media-r2.ts', import.meta.url);
const migration = new URL('../../backend/supabase/migrations/20261121140000_media_administration.sql', import.meta.url);

test('Media page gates upload and delete behind staff capabilities', async () => {
  const source = await readFile(actionPage, 'utf8');
  assert.match(source, /has_capability/);
  assert.match(source, /article\.create/);
  assert.match(source, /article\.publish/);
  assert.match(source, /radio\.manage/);
  assert.match(source, /R2 storage is not configured/);
  assert.match(source, /row sets? deleted|the stored object could not be deleted/);
});

test('Media upload validates, stores to R2 and registers an audited record', async () => {
  const actionsSource = await readFile(actions, 'utf8');
  assert.match(actionsSource, /MAX_BYTES = 26_214_400/);
  assert.match(actionsSource, /media_asset_create/);
  assert.match(actionsSource, /media_asset_delete/);
  assert.match(actionsSource, /missing_alt/);

  const r2Source = await readFile(r2, 'utf8');
  assert.match(r2Source, /import "server-only"/);
  assert.match(r2Source, /api\.cloudflare\.com/);
  assert.doesNotMatch(r2Source, /process\.env\.(?!R2_|CLOUDFLARE_API_TOKEN)/);
});

test('Media migration is additive, capability-gated and audited', async () => {
  const source = await readFile(migration, 'utf8');
  assert.match(source, /security definer/);
  assert.match(source, /has_capability\('article\.create'\) or public\.has_capability\('radio\.manage'\)/);
  assert.match(source, /has_capability\('article\.publish'\) or public\.has_capability\('radio\.manage'\)/);
  assert.match(source, /audit_event\('staff', 'media\.asset_create'/);
  assert.match(source, /audit_event\('staff', 'media\.asset_delete'/);
  assert.match(source, /grant execute on function public\.media_asset_create/);
  assert.match(source, /grant execute on function public\.media_asset_delete/);
  assert.doesNotMatch(source, /drop table|drop function public\.media_asset/i);
});
