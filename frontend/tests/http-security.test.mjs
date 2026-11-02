import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { checkBrowserMutation, corsHeaders } from '../../backend/packages/http-security/src/index.ts';

test('browser mutation guard requires a trusted exact HTTPS origin and matching CSRF token', () => {
  const token = randomBytes(32).toString('base64url');
  const trustedOrigins = ['https://admin.example.invalid'];
  const valid = { origin: trustedOrigins[0], trustedOrigins, csrfCookie: token, csrfHeader: token };
  assert.equal(checkBrowserMutation(valid), true);
  for (const origin of [null, 'null', '*', 'http://admin.example.invalid', 'https://admin.example.invalid.evil.invalid', 'https://admin.example.invalid/', 'https://admin.example.invalid/path', 'https://user@admin.example.invalid']) {
    assert.equal(checkBrowserMutation({ ...valid, origin }), false, String(origin));
  }
  for (const csrfHeader of [null, '', 'a'.repeat(42), 'a'.repeat(43), '💥'.repeat(43)]) {
    assert.equal(checkBrowserMutation({ ...valid, csrfHeader }), false);
  }
  assert.equal(checkBrowserMutation({ ...valid, trustedOrigins: ['*'] }), false);
});

test('CORS never reflects unknown origins and credentials are only enabled on explicit matches', () => {
  const origin = 'https://admin.example.invalid';
  assert.deepEqual(corsHeaders(origin, [], true), { Vary: 'Origin' });
  assert.deepEqual(corsHeaders('null', [origin], true), { Vary: 'Origin' });
  assert.deepEqual(corsHeaders(origin, ['*'], true), { Vary: 'Origin' });
  assert.deepEqual(corsHeaders(origin, [origin]), { Vary: 'Origin', 'Access-Control-Allow-Origin': origin });
  assert.deepEqual(corsHeaders(origin, [origin], true), { Vary: 'Origin', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' });
});
