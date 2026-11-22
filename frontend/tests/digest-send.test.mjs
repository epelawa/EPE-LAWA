import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('digest auto-send is capability-gated and reuses the newsroom origin', async () => {
  const action = await read('frontend/apps/admin/app/(protected)/digest/send-action.ts');
  assert.match(action, /"use server"/);
  assert.match(action, /has_capability", \{ p_capability: "article\.publish" \}/);
  assert.match(action, /NEXT_PUBLIC_SITE_URL/);
  assert.match(action, /sendWeeklyDigest/);
  assert.match(action, /revalidatePath\("\/admin\/digest"\)/);
  assert.match(action, /from "\.\.\/\.\.\/\.\.\/\.\.\/main\/lib\/digest-mailer"/);
  assert.match(action, /no active newsletter subscribers exist yet/);
  assert.match(action, /Newsletter SMTP is not configured for this environment/);
});

test('the digest page mounts the send form and states the SMTP gate honestly', async () => {
  const page = await read('frontend/apps/admin/app/(protected)/digest/page.tsx');
  assert.match(page, /digestSmtpConfigured/);
  assert.match(page, /<DigestSendForm \/>/);
  const form = await read('frontend/apps/admin/app/(protected)/digest/send-form.tsx');
  assert.match(form, /useActionState\(sendDigestNow/);
  assert.match(form, /Sending…/);
});

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
