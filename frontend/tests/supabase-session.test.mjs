import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAdminAccessForSession } from '../apps/admin/lib/supabase-access.ts';

const cookieName = '__Host-epelawa-admin';
function sessionCookie(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const value = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_at: expiresAt, expires_in: 3600, user: { id: 'staff-a' } };
  return { name: cookieName, value: 'base64-' + Buffer.from(JSON.stringify(value)).toString('base64url') };
}

function cookieStore(cookies = []) {
  const writes = [];
  return { writes, getAll: () => cookies, setAll: (set, headers) => writes.push({ set, headers }) };
}

test('server session gate verifies Auth before checking current RLS grants and fails closed', async () => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  let scenario = 'active';
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const path = new URL(req.url).pathname;
    calls.push(path);
    assert.equal(req.cache, 'no-store');
    if (scenario === 'offline') throw new Error('offline');
    if (path === '/auth/v1/user' && scenario === 'invalid') return new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } });
    let data;
    if (path === '/auth/v1/user') data = { id: 'staff-a', aud: 'authenticated', email_confirmed_at: scenario === 'unverified' ? null : '2026-01-01T00:00:00Z' };
    else if (path === '/rest/v1/staff_profiles') data = [{ user_id: 'staff-a', is_active: scenario !== 'inactive' }];
    else if (path === '/rest/v1/staff_capability_grants') data = scenario === 'revoked' ? [] : [{ user_id: 'staff-a', capability: 'admin.access' }];
    else throw new Error(`Unexpected request: ${path}`);
    assert.equal(req.headers.get('authorization'), 'Bearer test-access-token');
    return Response.json(data);
  };
  try {
    assert.deepEqual(await getAdminAccessForSession(cookieStore([sessionCookie()])), { allowed: true, userId: 'staff-a' });
    assert.deepEqual(calls, ['/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']);
    for (const [mode, expected] of [
      ['invalid', ['/auth/v1/user']],
      ['unverified', ['/auth/v1/user']],
      ['inactive', ['/auth/v1/user', '/rest/v1/staff_profiles']],
      ['revoked', ['/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']],
      ['offline', ['/auth/v1/user']],
    ]) {
      scenario = mode; calls.length = 0;
      assert.deepEqual(await getAdminAccessForSession(cookieStore([sessionCookie()])), { allowed: false, userId: null }, mode);
      assert.deepEqual(calls, expected, mode);
    }
    scenario = 'active'; calls.length = 0;
    assert.deepEqual(await getAdminAccessForSession(cookieStore()), { allowed: false, userId: null }, 'missing session');
    assert.ok(!calls.includes('/rest/v1/staff_profiles'));
    calls.length = 0;
    for (const value of [
      'not-a-session',
      'base64-' + Buffer.from(JSON.stringify({ user: { id: 'staff-a' } })).toString('base64url'),
      'base64-' + Buffer.from(JSON.stringify({ access_token: 5, user: { id: 'staff-a' } })).toString('base64url'),
      'base64-' + Buffer.from(JSON.stringify({ access_token: 'token', user: null })).toString('base64url'),
      'base64-' + Buffer.from(JSON.stringify([])).toString('base64url'),
    ]) {
      assert.deepEqual(await getAdminAccessForSession(cookieStore([{ name: cookieName, value }])), { allowed: false, userId: null }, 'malformed session payload');
    }
    assert.ok(!calls.includes('/rest/v1/staff_profiles'));
    calls.length = 0;
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_no';
    assert.deepEqual(await getAdminAccessForSession(cookieStore([sessionCookie()])), { allowed: false, userId: null });
    assert.equal(calls.length, 0);
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
    process.env.SUPABASE_URL = 'http://unit.example.invalid';
    assert.deepEqual(await getAdminAccessForSession(cookieStore([sessionCookie()])), { allowed: false, userId: null });
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test('refreshed session cookies retain host-only security flags and no-store headers', async () => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const path = new URL(req.url).pathname;
    calls.push(path);
    assert.equal(req.cache, 'no-store');
    if (path === '/auth/v1/token') return Response.json({ access_token: 'refreshed-token', refresh_token: 'refreshed-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'staff-a', aud: 'authenticated' } });
    assert.equal(req.headers.get('authorization'), 'Bearer refreshed-token');
    if (path === '/auth/v1/user') return Response.json({ id: 'staff-a', aud: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z' });
    if (path === '/rest/v1/staff_profiles') return Response.json([{ user_id: 'staff-a', is_active: true }]);
    if (path === '/rest/v1/staff_capability_grants') return Response.json([{ user_id: 'staff-a', capability: 'admin.access' }]);
    throw new Error(`Unexpected request: ${path}`);
  };
  try {
    const store = cookieStore([sessionCookie(Math.floor(Date.now() / 1000) - 10)]);
    assert.deepEqual(await getAdminAccessForSession(store), { allowed: true, userId: 'staff-a' });
    assert.deepEqual(calls, ['/auth/v1/token', '/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']);
    assert.ok(store.writes.length > 0);
    for (const { set, headers } of store.writes) {
      assert.match(headers['Cache-Control'], /no-store/);
      for (const cookie of set) {
        assert.match(cookie.name, /^__Host-epelawa-admin(?:\.\d+)?$/);
        assert.equal(cookie.options.httpOnly, true);
        assert.equal(cookie.options.secure, true);
        assert.equal(cookie.options.sameSite, 'lax');
        assert.equal(cookie.options.path, '/');
        assert.equal(cookie.options.domain, undefined);
      }
    }
    const brokenStore = cookieStore([sessionCookie(Math.floor(Date.now() / 1000) - 10)]);
    brokenStore.setAll = () => { throw new Error('response unavailable'); };
    assert.deepEqual(await getAdminAccessForSession(brokenStore), { allowed: false, userId: null });
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test('read-only route adapter returns refreshed cookies and denies without rendering protected content', async () => {
  const { NextRequest, NextResponse } = await import('../apps/admin/node_modules/next/server.js');
  const { respondToAdminRead } = await import('../apps/admin/lib/supabase-access.ts');
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  let revoked = false;
  let largeSession = false;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const path = new URL(req.url).pathname;
    calls.push(path);
    assert.equal(req.cache, 'no-store');
    if (path === '/auth/v1/token') return Response.json({ access_token: largeSession ? 'x'.repeat(10000) : 'refreshed-token', refresh_token: 'refreshed-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'staff-a', aud: 'authenticated' } });
    assert.equal(req.headers.get('authorization'), 'Bearer ' + (largeSession ? 'x'.repeat(10000) : 'refreshed-token'));
    if (path === '/auth/v1/user') return Response.json({ id: 'staff-a', aud: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z' });
    if (path === '/rest/v1/staff_profiles') return Response.json([{ user_id: 'staff-a', is_active: true }]);
    if (path === '/rest/v1/staff_capability_grants') return Response.json(revoked ? [] : [{ user_id: 'staff-a', capability: 'admin.access' }]);
    throw new Error(`Unexpected request: ${path}`);
  };
  const expired = sessionCookie(Math.floor(Date.now() / 1000) - 10);
  const request = () => new NextRequest('https://admin.example.invalid/', { headers: { cookie: `${expired.name}=${expired.value}` } });
  let renders = 0;
  const protectedResponse = (access) => {
    renders++;
    assert.equal(access.userId, 'staff-a');
    return new NextResponse('protected content', { headers: { 'Cache-Control': 'public, max-age=3600', 'X-Test': 'preserved' } });
  };
  try {
    const response = await respondToAdminRead(request(), protectedResponse);
    assert.equal(response.status, 200);
    assert.equal(renders, 1);
    assert.deepEqual(calls, ['/auth/v1/token', '/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/staff_capability_grants']);
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.equal(response.headers.get('pragma'), 'no-cache');
    assert.equal(response.headers.get('expires'), '0');
    assert.equal(response.headers.get('x-test'), 'preserved');
    assert.equal(await response.text(), 'protected content');
    const setCookie = response.headers.get('set-cookie');
    assert.match(setCookie, /^__Host-epelawa-admin(?:\.\d+)?=/);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(setCookie, /Domain=/i);

    largeSession = true;
    const chunked = await respondToAdminRead(request(), protectedResponse);
    const chunks = chunked.cookies.getAll().filter(({ name }) => /^__Host-epelawa-admin\.\d+$/.test(name));
    assert.ok(chunks.length > 1, 'all chunks are carried to the returned response');
    for (const cookie of chunks) {
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.secure, true);
      assert.equal(cookie.sameSite, 'lax');
      assert.equal(cookie.path, '/');
      assert.equal(cookie.domain, undefined);
    }
    assert.match(chunked.headers.get('cache-control'), /no-store/);
    largeSession = false;

    revoked = true;
    const denied = await respondToAdminRead(request(), protectedResponse);
    assert.equal(denied.status, 403);
    assert.equal(renders, 2, 'no protected response on revocation');
    assert.match(denied.headers.get('cache-control'), /no-store/);
    assert.match(denied.headers.get('set-cookie'), /^__Host-epelawa-admin/);
    assert.doesNotMatch(await denied.text(), /protected content/);

    revoked = false;
    const broken = await respondToAdminRead(request(), () => {
      const response = new NextResponse('must not escape');
      response.cookies.set = () => { throw new Error('cannot write cookie'); };
      return response;
    });
    assert.equal(broken.status, 503);
    assert.match(broken.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await broken.text(), /must not escape/);
    const thrown = await respondToAdminRead(request(), () => { throw new Error('render failed'); });
    assert.equal(thrown.status, 503);
    assert.match(thrown.headers.get('cache-control'), /no-store/);

    calls.length = 0;
    delete process.env.SUPABASE_URL;
    const noConfig = await respondToAdminRead(request(), protectedResponse);
    assert.equal(noConfig.status, 403);
    assert.equal(renders, 2);
    assert.match(noConfig.headers.get('cache-control'), /no-store/);
    assert.equal(noConfig.headers.get('set-cookie'), null);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
