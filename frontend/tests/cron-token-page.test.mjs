import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../apps/admin/app/(protected)/settings/cron/page.tsx', import.meta.url), 'utf8');
const routes = ['database-ping', 'history'].map((r) => readFileSync(new URL(`../apps/main/app/api/cron/${r}/route.ts`, import.meta.url), 'utf8'));

test('the cron token is only computed for the primary administrators and rendered hidden', () => {
  assert.match(page, /const owner = await db\.rpc\("staff_roles_authorized"\);\s*const canSeeToken = !owner\.error && owner\.data === true;\s*const token = canSeeToken \? cronAccessToken\(\) : null;/);
  assert.match(page, /<SecretField value=\{token\}/);
  assert.doesNotMatch(page, /process\.env\.CRON_SECRET/, 'the page never reads or shows the raw secret');
});

test('every cron route checks the token with the shared constant-time check', () => {
  for (const source of routes) {
    assert.doesNotMatch(source, /authHeader !== cronSecret/);
    const handlers = source.match(/export async function (GET|POST)\(request: Request\)[^{]*\{\s*if \(!cronRequestAuthorized\(request\.headers\)\)/g) ?? [];
    assert.equal(handlers.length, (source.match(/export async function (GET|POST)/g) ?? []).length);
  }
});
