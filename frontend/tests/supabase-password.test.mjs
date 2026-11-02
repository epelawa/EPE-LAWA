import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signInAdminWithPassword } from '../apps/admin/lib/supabase-access.ts';

const cookieName = '__Host-epelawa-admin';
const input = { email: 'staff@example.invalid', password: 'test-only password' };
function store() {
  const writes = [];
  return { writes, getAll: () => [], setAll: (cookies, headers) => writes.push({ cookies, headers }) };
}

test('password sign-in stages cookies until identity and active admin grant are verified', async () => {
  const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  let scenario = 'active';
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init), url = new URL(req.url), path = url.pathname;
    calls.push(path);
    assert.equal(req.cache, 'no-store');
    if (path === '/auth/v1/token') {
      assert.equal(url.searchParams.get('grant_type'), 'password');
      assert.deepEqual(await req.json(), { email: 'staff@example.invalid', password: 'test-only password', gotrue_meta_security: {} });
      if (scenario === 'invalid') return Response.json({ error: 'invalid_grant' }, { status: 400 });
      if (scenario === 'offline') throw new Error('provider offline');
      return Response.json({ access_token: 'fake-access', refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'staff-a', aud: 'authenticated' } });
    }
    if (path === '/auth/v1/logout') return new Response(null, { status: 204 });
    assert.equal(req.headers.get('authorization'), 'Bearer fake-access');
    if (path === '/auth/v1/user') return Response.json({ id: scenario === 'mismatch' ? 'staff-b' : 'staff-a', aud: 'authenticated' });
    if (path === '/rest/v1/staff_profiles') return Response.json([{ user_id: 'staff-a', is_active: scenario !== 'inactive' }]);
    if (path === '/rest/v1/staff_capability_grants') return Response.json(scenario === 'revoked' ? [] : [{ user_id: 'staff-a', capability: 'admin.access' }]);
    throw new Error('unexpected path ' + path);
  };
  try {
    const result = store();
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, result), { allowed: true });
    assert.deepEqual(calls, ['/auth/v1/token', '/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']);
    assert.ok(result.writes.length > 0);
    for (const { cookies, headers } of result.writes) {
      assert.match(headers['Cache-Control'], /no-store/);
      for (const cookie of cookies) {
        assert.match(cookie.name, /^__Host-epelawa-admin(?:\.\d+)?$/);
        assert.equal(cookie.options.secure, true);
        assert.equal(cookie.options.httpOnly, true);
        assert.equal(cookie.options.sameSite, 'lax');
        assert.equal(cookie.options.path, '/');
        assert.equal(cookie.options.domain, undefined);
      }
    }
    assert.ok(result.writes.some(({ cookies }) => cookies.some(({ name }) => name === cookieName)));
    for (const mode of ['invalid', 'offline', 'inactive', 'revoked', 'mismatch']) {
      scenario = mode; calls.length = 0;
      const denied = store();
      assert.deepEqual(await signInAdminWithPassword(input.email, input.password, denied), { allowed: false }, mode);
      assert.equal(denied.writes.length, 0, mode);
      if (['inactive', 'revoked', 'mismatch'].includes(mode)) assert.ok(calls.includes('/auth/v1/logout'), mode);
    }
    scenario = 'active'; calls.length = 0;
    const broken = store(); broken.setAll = () => { throw new Error('write failed'); };
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, broken), { allowed: false });
    assert.ok(calls.includes('/auth/v1/logout'));
    calls.length = 0;
    for (const [email, password] of [[null, 'x'], ['bad', 'x'], ['a@b', ''], ['a@b', 'x'.repeat(1025)], ['a b@c', 'x']]) {
      assert.deepEqual(await signInAdminWithPassword(email, password, store()), { allowed: false });
    }
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
