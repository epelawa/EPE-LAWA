import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signInAdminWithPassword } from '../apps/admin/lib/supabase-access.ts';

const cookieName = '__Host-epelawa-admin';
const input = { email: 'staff@example.invalid', password: 'test-only password' };
function store(existingCookies = []) {
  const writes = [];
  return { writes, getAll: () => existingCookies, setAll: (cookies, headers) => writes.push({ cookies, headers }) };
}

test('password sign-in stages cookies until identity and effective admin capability are verified', async () => {
  const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  let scenario = 'active';
  let largeSession = false;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init), url = new URL(req.url), path = url.pathname;
    calls.push(path);
    assert.equal(req.cache, 'no-store');
    if (path === '/auth/v1/token') {
      assert.equal(url.searchParams.get('grant_type'), 'password');
      assert.deepEqual(await req.json(), { email: 'staff@example.invalid', password: 'test-only password', gotrue_meta_security: {} });
      if (scenario === 'invalid') return Response.json({ error: 'invalid_grant' }, { status: 400 });
      if (scenario === 'wrong-password') return Response.json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 });
      if (scenario === 'unconfirmed-email') return Response.json({ code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, { status: 400 });
      if (scenario === 'provider-limit') return Response.json({ code: 429, error_code: 'over_request_rate_limit' }, { status: 429 });
      if (scenario === 'offline') throw new Error('provider offline');
      return Response.json({ access_token: largeSession ? 'x'.repeat(10000) : 'fake-access', refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'staff-a', aud: 'authenticated' } });
    }
    if (path === '/auth/v1/logout') return new Response(null, { status: 204 });
    assert.equal(req.headers.get('authorization'), `Bearer ${largeSession ? 'x'.repeat(10000) : 'fake-access'}`);
    if (path === '/auth/v1/user') return scenario === 'user-error' ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json({ id: scenario === 'mismatch' ? 'staff-b' : 'staff-a', aud: 'authenticated', email_confirmed_at: scenario === 'unverified' ? null : '2026-01-01T00:00:00Z' });
    if (path === '/rest/v1/staff_profiles') return scenario === 'profile-error' ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json([{ user_id: 'staff-a', is_active: scenario !== 'inactive' }]);
    if (path === '/rest/v1/rpc/has_capability') return scenario === 'grant-error' ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json(scenario !== 'revoked');
    throw new Error('unexpected path ' + path);
  };
  try {
    const result = store();
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, result), { allowed: true, password: 'verified' });
    assert.deepEqual(calls, ['/auth/v1/token', '/auth/v1/user', '/rest/v1/staff_profiles', '/rest/v1/rpc/has_capability']);
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

    largeSession = true; calls.length = 0;
    const large = store();
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, large), { allowed: true, password: 'verified' });
    const largeCookies = large.writes.flatMap(({ cookies }) => cookies).filter(({ options }) => options.maxAge > 0);
    assert.ok(largeCookies.some(({ name }) => name === `${cookieName}.1`), 'large login sessions are split into numbered cookies');
    for (const cookie of largeCookies) {
      assert.equal(cookie.options.secure, true);
      assert.equal(cookie.options.httpOnly, true);
      assert.equal(cookie.options.sameSite, 'lax');
      assert.equal(cookie.options.path, '/');
      assert.equal(cookie.options.domain, undefined);
    }
    largeSession = false; calls.length = 0;
    const stale = store([{ name: `${cookieName}.1`, value: 'old chunk' }]);
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, stale), { allowed: true, password: 'verified' });
    assert.ok(stale.writes.flatMap(({ cookies }) => cookies).some(({ name, options }) => name === `${cookieName}.1` && options.maxAge === 0), 'small login sessions expire old numbered chunks');

    // `password` feeds the per-account throttle: only a provider-confirmed wrong password counts,
    // a session that was issued proves the password even when a later staff check refuses.
    const passwordOutcome = { 'wrong-password': 'rejected', invalid: 'unknown', 'provider-limit': 'unknown', offline: 'unknown' };
    for (const mode of ['wrong-password', 'unconfirmed-email', 'provider-limit', 'invalid', 'offline', 'inactive', 'revoked', 'mismatch', 'unverified', 'user-error', 'profile-error', 'grant-error']) {
      scenario = mode; calls.length = 0;
      const denied = store();
      assert.deepEqual(await signInAdminWithPassword(input.email, input.password, denied), { allowed: false, password: passwordOutcome[mode] ?? 'verified' }, mode);
      assert.equal(denied.writes.length, 0, mode);
      if (['inactive', 'revoked', 'mismatch', 'unverified', 'user-error', 'profile-error', 'grant-error'].includes(mode)) assert.ok(calls.includes('/auth/v1/logout'), mode);
    }
    scenario = 'active'; calls.length = 0;
    const broken = store(); broken.setAll = () => { throw new Error('write failed'); };
    assert.deepEqual(await signInAdminWithPassword(input.email, input.password, broken), { allowed: false, password: 'verified' });
    assert.ok(calls.includes('/auth/v1/logout'));
    calls.length = 0;
    for (const [email, password] of [[null, 'x'], ['bad', 'x'], ['a@b', ''], ['a@b', 'x'.repeat(1025)], ['a b@c', 'x'], ['x'.repeat(250) + '@a.com', 'x'], ['a@b.com', 'x'.repeat(1025)]]) {
      assert.deepEqual(await signInAdminWithPassword(email, password, store()), { allowed: false, password: 'unknown' });
    }
    assert.equal(calls.length, 0);
    for (const [url, key] of [['http://unit.example.invalid', 'sb_publishable_test_only'], ['https://unit.example.invalid', 'sb_secret_no'], ['', 'sb_publishable_test_only']]) {
      process.env.SUPABASE_URL = url;
      process.env.SUPABASE_PUBLISHABLE_KEY = key;
      assert.deepEqual(await signInAdminWithPassword(input.email, input.password, store()), { allowed: false, password: 'unknown' });
    }
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test('unwired logout clears only host-only admin cookies and reports provider failure honestly', async () => {
  const { signOutAdminSession } = await import('../apps/admin/lib/supabase-access.ts');
  const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = 'https://unit.example.invalid';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  const value = { access_token: 'fake-access', refresh_token: 'fake-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: { id: 'staff-a' } };
  const encodedSession = Buffer.from(JSON.stringify(value)).toString('base64url');
  const cookies = [
    { name: cookieName, value: encodedSession.slice(0, 40) },
    { name: cookieName + '.1', value: encodedSession.slice(40, 80) },
    { name: cookieName + '.2', value: encodedSession.slice(80) },
    { name: 'unrelated', value: 'keep' },
  ];
  let fail = false, calls = 0;
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    assert.equal(req.cache, 'no-store');
    assert.equal(new URL(req.url).pathname, '/auth/v1/logout');
    assert.equal(req.headers.get('authorization'), 'Bearer fake-access');
    calls++;
    if (fail) throw new Error('offline');
    return new Response(null, { status: 204 });
  };
  const makeStore = () => { const writes = []; return { writes, getAll: () => cookies, setAll: (items, headers) => writes.push({ items, headers }) }; };
  try {
    const saved = makeStore();
    assert.deepEqual(await signOutAdminSession(saved), { revoked: true, cookiesCleared: true });
    assert.equal(calls, 1);
    assert.match(saved.writes[0].headers['Cache-Control'], /no-store/);
    assert.deepEqual(saved.writes[0].items.map(c => c.name).sort(), [cookieName, cookieName + '.1', cookieName + '.2'].sort());
    for (const c of saved.writes[0].items) assert.deepEqual(c.options, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
    fail = true;
    const offline = makeStore();
    assert.deepEqual(await signOutAdminSession(offline), { revoked: false, cookiesCleared: true });
    assert.equal(offline.writes.length, 1);
    const broken = makeStore(); broken.setAll = () => { throw new Error('write failed'); };
    assert.deepEqual(await signOutAdminSession(broken), { revoked: false, cookiesCleared: false });
    delete process.env.SUPABASE_URL;
    const noConfig = makeStore();
    assert.deepEqual(await signOutAdminSession(noConfig), { revoked: false, cookiesCleared: true });
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
