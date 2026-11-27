import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actions = readFileSync(new URL('../apps/main/app/auth/actions.ts', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../apps/admin/app/layout.tsx', import.meta.url), 'utf8');

test('a resend posted to the code form is charged to auth_resend before any code budget (CodeRabbit on PR #282)', () => {
  const body = actions.slice(actions.indexOf('export async function verifyEmailOtp'));
  const resend = body.indexOf('field(data, "intent") === "resend") return resendSignupVerification(');
  const otp = body.indexOf('formRateAllowance("auth_otp"');
  assert.ok(resend > 0 && otp > 0 && resend < otp, 'resend is routed before the auth_otp budget and the code lane');
  assert.match(actions, /export async function resendSignupVerification[\s\S]{0,200}formRateAllowance\("auth_resend"\)/);
});

test('the standalone admin document loads the Turnstile widget when a site key is set', () => {
  assert.match(layout, /turnstileSiteKey\(\) \? \(\s*<script src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit" async defer nonce=\{nonce\} \/>/);
});
