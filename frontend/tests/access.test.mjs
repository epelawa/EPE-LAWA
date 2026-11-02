import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAdminAccess } from '../../backend/packages/auth/src/access.ts';

test('missing, malformed and oversized tokens are denied without contacting a provider', async () => {
  const provider = {
    verifyUser: async () => { throw new Error('must not be called'); },
    hasActiveAdminGrant: async () => { throw new Error('must not be called'); },
  };
  for (const token of [null, undefined, '', 'a b', 'x'.repeat(8193)]) {
    assert.deepEqual(await authorizeAdminAccess(token, provider), { allowed: false });
  }
});

test('a verified user without an active explicit grant is denied', async () => {
  const provider = { verifyUser: async () => ({ id: 'staff-a' }), hasActiveAdminGrant: async () => false };
  assert.deepEqual(await authorizeAdminAccess('token', provider), { allowed: false });
});

test('a verified user and an active explicit entry grant are required on every request', async () => {
  let granted = true;
  let checks = 0;
  const provider = {
    verifyUser: async () => ({ id: 'staff-a' }),
    hasActiveAdminGrant: async (id) => { checks++; assert.equal(id, 'staff-a'); return granted; },
  };
  assert.deepEqual(await authorizeAdminAccess('token', provider), { allowed: true, userId: 'staff-a' });
  granted = false;
  assert.deepEqual(await authorizeAdminAccess('token', provider), { allowed: false });
  assert.equal(checks, 2);
});

test('forged identity, provider errors and non-boolean grants fail closed', async () => {
  const cases = [
    { verifyUser: async () => null, hasActiveAdminGrant: async () => true },
    { verifyUser: async () => ({ id: '' }), hasActiveAdminGrant: async () => true },
    { verifyUser: async () => { throw new Error('upstream'); }, hasActiveAdminGrant: async () => true },
    { verifyUser: async () => ({ id: 'staff-a' }), hasActiveAdminGrant: async () => { throw new Error('database'); } },
    { verifyUser: async () => ({ id: 'staff-a' }), hasActiveAdminGrant: async () => 'true' },
  ];
  for (const provider of cases) assert.deepEqual(await authorizeAdminAccess('token', provider), { allowed: false });
});

test('unwired admin redirect helper only accepts explicit literal same-host paths', async () => {
  const { safeAdminRedirect } = await import('../../backend/packages/auth/src/access.ts');
  const allowed = ['/dashboard', '/articles/review', '/'];
  for (const path of allowed) assert.equal(safeAdminRedirect(path, allowed), path);
  for (const path of [null, undefined, '', '/articles', '//evil.invalid', 'https://evil.invalid', '/\\evil.invalid', '/%2F%2Fevil.invalid', '/%2e%2e/dashboard', '/articles/../dashboard', '/articles//review', '/dashboard?next=https://evil.invalid', '/dashboard#section', '/dashboard/', '/dashboard\n', '/dashboard\r\nLocation: https://evil.invalid', '/é', '/x'.repeat(300)]) {
    assert.equal(safeAdminRedirect(path, allowed), '/', String(path));
  }
  assert.equal(safeAdminRedirect('/dashboard', []), '/');
  assert.equal(safeAdminRedirect('//evil.invalid', ['//evil.invalid']), '/');
  assert.equal(safeAdminRedirect('/articles/../dashboard', ['/articles/../dashboard']), '/');
});
