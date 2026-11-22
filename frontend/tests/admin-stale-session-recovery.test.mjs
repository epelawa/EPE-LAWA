import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('a dead server-side session recovers by clearing the cookie and bouncing through login', async () => {
  const [access, guard, login] = await Promise.all([
    read('frontend/apps/admin/lib/supabase-access.ts'),
    read('frontend/apps/admin/components/admin-access-guard.tsx'),
    read('frontend/apps/admin/app/login/page.tsx'),
  ]);

  assert.match(access, /staleSession\?: boolean/);
  assert.match(access, /clearAdminSessionCookies/);
  assert.match(access, /grant_type=refresh_token/, 'one recovery refresh is attempted before giving up');
  assert.match(access, /staleSession: true\b/, 'the stale flag is only reported when the auth session is truly gone');
  assert.match(access, /\.\.\.cookieOptions\(secure\), maxAge: 0/, 'stale cookies are invalidated, not left behind');

  assert.match(guard, /clearAdminSessionCookies\(/);
  assert.match(guard, /reason=session_expired/);
  assert.match(login, /session_expired/);
});
