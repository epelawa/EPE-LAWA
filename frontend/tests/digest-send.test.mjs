import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

// The staff digest page and its send action were withdrawn in 43835ed ("Remove digest, poll, events,
// and radio/requests pages from admin"). The shared mailer remains and is still covered below.
test('the digest mailer stays within the recipient cap and escapes every database string', async () => {
  const mailer = await read('frontend/apps/main/lib/digest-mailer.ts');
  assert.match(mailer, /MAX_RECIPIENTS = 500/);
  assert.match(mailer, /staff_digest_snapshot/);
  assert.match(mailer, /p_days: 7/);
  assert.match(mailer, /\.eq\("status", "active"\)/);
  assert.match(mailer, /\.order\("subscribed_at"/);
  assert.match(mailer, /\.limit\(MAX_RECIPIENTS \+ 1\)/);
  assert.match(mailer, /emailShell/);
  for (const call of ['digestEmailHtml', 'escapeHtml']) assert.match(mailer, new RegExp(call));
  const newsletterMailer = await read('frontend/apps/main/lib/newsletter-mailer.ts');
  assert.match(newsletterMailer, /connectionTimeout: 8000/);
  assert.match(mailer, /Unsubscribe with the private link in your signup confirmation email\./);
  assert.match(mailer, /export function digestSmtpConfigured/);
});
