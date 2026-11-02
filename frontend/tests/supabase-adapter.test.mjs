import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAdminAccessForToken } from '../apps/admin/lib/supabase-access.ts';

test('server adapter verifies identity before RLS-scoped profile and grant reads', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const calls = [];
  let mode = 'success';
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    calls.push(url.pathname);
    assert.equal(req.headers.get('authorization'), 'Bearer test-token');
    assert.equal(req.headers.get('apikey'), 'sb_publishable_test_only');
    let body;
    if (mode === 'network-error') throw new Error('network unavailable');
    if (url.pathname === '/auth/v1/user' && mode === 'invalid-token') return new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') body = { id: 'staff-a', aud: 'authenticated' };
    else if (url.pathname === '/rest/v1/staff_profiles') body = [{ user_id: 'staff-a', is_active: mode !== 'inactive' }];
    else if (url.pathname === '/rest/v1/staff_capability_grants') body = mode === 'missing-grant' ? [] : [{ user_id: 'staff-a', capability: 'admin.access' }];
    else throw new Error(`Unexpected request to ${url.pathname}`);
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    assert.deepEqual(await getAdminAccessForToken('test-token'), { allowed: true, userId: 'staff-a' });
    assert.deepEqual(calls, ['/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']);
    for (const [scenario, expectedCalls] of [
      ['invalid-token', ['/auth/v1/user']],
      ['inactive', ['/auth/v1/user', '/rest/v1/staff_profiles']],
      ['missing-grant', ['/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']],
      ['network-error', ['/auth/v1/user']],
    ]) {
      mode = scenario;
      calls.length = 0;
      assert.deepEqual(await getAdminAccessForToken('test-token'), { allowed: false }, scenario);
      assert.deepEqual(calls, expectedCalls, scenario);
    }
    mode = 'success';
    calls.length = 0;
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_not_allowed';
    assert.deepEqual(await getAdminAccessForToken('test-token'), { allowed: false });
    assert.equal(calls.length, 0, 'secret keys must be rejected before network access');
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
    process.env.SUPABASE_URL = 'http://unit.example.invalid';
    assert.deepEqual(await getAdminAccessForToken('test-token'), { allowed: false });
    assert.equal(calls.length, 0, 'insecure URLs must be rejected before network access');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});
