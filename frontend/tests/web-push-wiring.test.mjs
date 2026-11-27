import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('web push is fully wired: worker, guest-capable subscribe route, encrypted device store', async () => {
  const [sw, route, prompt, client, layout, migration] = await Promise.all([
    read('frontend/apps/main/public/sw.js'),
    read('frontend/apps/main/app/api/notifications/subscribe/route.ts'),
    read('frontend/apps/main/components/push-onboarding.tsx'),
    read('frontend/apps/main/lib/push-client.ts'),
    read('frontend/apps/main/app/layout.tsx'),
    read('backend/supabase/migrations/20261124130000_push_subscription_register.sql'),
  ]);

  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /notificationclick/);
  assert.doesNotMatch(sw, /https:\/\/(?!$)/, 'worker drops absolute urls');

  assert.match(route, /WEB_PUSH_READY/);
  assert.match(route, /formRateAllowance\("push_subscribe", 5\)/);
  // Turn 4 owner brief: push works without an account. Devices are stored encrypted in web_push_devices.
  assert.match(route, /from\("web_push_devices"\)/);
  assert.match(route, /sealPushValue\(endpoint\)/, 'endpoints are encrypted at rest');
  assert.match(route, /endpointHash\(endpoint\)/, 'lookups use an HMAC, never the clear endpoint');
  assert.doesNotMatch(route, /Sign in to save notification settings/);
  assert.match(route, /error: \{ http_code: status, message \}/, 'errors stay structured');
  assert.match(route, /\^\^?https:/, 'endpoint must be https');

  assert.match(migration, /function public\.form_rate_limit/);
  assert.match(migration, /'push_subscribe'/);
  assert.match(migration, /function public\.push_subscription_register/);
  assert.match(migration, /auth\.uid\(\)\) is null or not public\.is_member_active\(\)/);
  assert.match(migration, /grant execute on function public\.push_subscription_register/);

  // Turn 3 owner brief: first-visit onboarding replaces the old unmounted prompt.
  // Turn 4 owner brief: it is shown to every visitor on arrival, no account needed.
  assert.doesNotMatch(prompt, /auth\.getSession\(\)/, 'guests are offered push too');
  assert.doesNotMatch(client, /reason: "signin"/, 'push never asks visitors to sign in');
  assert.match(prompt, /pushPermission\(\) !== "default"/, 'never re-prompts once the browser decided');
  assert.match(prompt, /onboardingSeen\(\)/, 'never re-prompts after dismissal');
  assert.match(prompt, /anotherDialogIsOpen\(\)/, 'never stacks over another dialog');
  assert.match(prompt, /Stay connected to Epe\./);
  assert.match(client, /pushManager\.getSubscription/, 'existing subscriptions are reused');
  assert.doesNotMatch(prompt, /requestPermission/, 'permission is only requested via enablePush from a click');
  assert.match(client, /Notification\.requestPermission\(\)/);
  assert.match(client, /data\.saved !== true/, 'success only after the server confirms');
  assert.doesNotMatch(layout, /<NotificationPrompt \/>/);
  assert.match(layout, /<PushOnboarding \/>/);
  // Topics are stored per device (and, for members, account-wide) where the fan-out reads them.
  assert.match(route, /push_news: chosen\.news/);
  assert.match(route, /push_news: topics\.news, push_radio: topics\.radio/);
  assert.match(route, /export async function DELETE/);
});

test('the AI Scheduler stub is retired from navigation, routes and tests', async () => {
  const navigation = await read('frontend/apps/admin/lib/navigation.ts');
  assert.doesNotMatch(navigation, /ai-scheduler/i);

  await assert.rejects(() => read('frontend/apps/admin/app/(protected)/ai-scheduler/page.tsx'));
  await assert.rejects(() => read('frontend/apps/main/app/admin/(protected)/ai-scheduler/page.tsx'));

  const routes = JSON.parse(await read('frontend/apps/main/public/manus-routes.json'));
  const paths = JSON.stringify(routes);
  assert.doesNotMatch(paths, /ai-scheduler/i);

  const allowance = await read('frontend/tests/public-copy-availability.test.mjs');
  assert.doesNotMatch(allowance, /ai-scheduler/i);
});

// Strix review on PR #275 (CWE-770): one shared 100/hour bucket per scope let a handful of networks lock every
// visitor out of forms, sign-in and notification settings.
test('shared rate ceilings cannot be drained by a few networks or by invented push endpoints', async () => {
  const [server, route] = await Promise.all([
    read('frontend/apps/main/lib/form-server.ts'),
    read('frontend/apps/main/app/api/notifications/subscribe/route.ts'),
  ]);
  assert.match(server, /p_global_limit: sharedHourlyLimit\(scope\)/, 'the helper always sends a shared ceiling');
  assert.match(server, /MAIL_SAFE_SHARED_HOURLY_LIMIT = 100;/, 'unlisted scopes keep the database default');
  assert.match(server, /auth_signin: 5000/);
  assert.match(server, /push_subscribe: 5000/);
  // Strix review on PR #277: a scope that sends email must never be in the raised table, or anyone could drain
  // the shared mail quota. Derive the mail-sending scopes from the code, not from a hand-kept list.
  const table = server.slice(server.indexOf('NON_MAIL_SHARED_HOURLY_LIMIT'), server.indexOf('};', server.indexOf('NON_MAIL_SHARED_HOURLY_LIMIT')));
  const raised = new Set([...table.matchAll(/([a-z_]+): \d+/g)].map((m) => m[1]));
  const actions = ['frontend/apps/main/app/auth/actions.ts', 'frontend/apps/main/app/business-directory/submit/actions.ts', 'frontend/apps/main/app/business-directory/claim-actions.ts',
    'frontend/apps/main/app/events/actions.ts', 'frontend/apps/main/app/itan-ilu-mi/actions.ts', 'frontend/apps/main/app/itan-ilu-mi/correction/actions.ts',
    'frontend/apps/main/app/tourism/actions.ts', 'frontend/apps/main/app/news/[slug]/correction-actions.ts', 'frontend/apps/main/app/dashboard/appeal-actions.ts', 'frontend/apps/main/app/forum/actions.ts'];
  let mailScopes = 0;
  for (const path of actions) {
    const source = await read(path);
    if (!/deliverAuthMessage|sendNewsletterConfirmation/.test(source) || path.endsWith('auth/actions.ts')) continue;
    for (const [, scope] of source.matchAll(/formRateAllowance\("([a-z_]+)"/g)) { mailScopes += 1; assert.ok(!raised.has(scope), `${scope} sends email and must keep the 100/hour ceiling`); }
  }
  assert.ok(mailScopes >= 4, 'business, event, history and correction submissions are recognised as mail-sending');
  for (const scope of ['auth_signup', 'auth_reset', 'auth_resend', 'auth_otp', 'business_submit', 'event_submit', 'history_submit', 'history_correction']) assert.ok(!raised.has(scope), `${scope} keeps 100/hour`);
  // PATCH and DELETE look the device up before spending the allowance.
  const patch = route.slice(route.indexOf('export async function PATCH'), route.indexOf('export async function DELETE'));
  const del = route.slice(route.indexOf('export async function DELETE'));
  for (const body of [patch, del]) assert.ok(body.indexOf('select(') < body.indexOf('formRateAllowance('), 'lookup happens before charging');
  assert.match(del, /if \(!device\.data && !legacy\.data\?\.length\) return Response\.json\(\{ removed: true \}/);
});
