import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('web push is fully wired: worker, authenticated subscribe route, registration RPC', async () => {
  const [sw, route, prompt, layout, migration] = await Promise.all([
    read('frontend/apps/main/public/sw.js'),
    read('frontend/apps/main/app/api/notifications/subscribe/route.ts'),
    read('frontend/apps/main/components/notification-prompt.tsx'),
    read('frontend/apps/main/app/layout.tsx'),
    read('backend/supabase/migrations/20261124130000_push_subscription_register.sql'),
  ]);

  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /notificationclick/);
  assert.doesNotMatch(sw, /https:\/\/(?!$)/, 'worker drops absolute urls');

  assert.match(route, /WEB_PUSH_READY/);
  assert.match(route, /formRateAllowance\("push_subscribe", 5\)/);
  assert.match(route, /push_subscription_register/);
  assert.match(route, /error: \{ http_code: status, message \}/, 'errors stay structured');
  assert.match(route, /\^\^?https:/, 'endpoint must be https');

  assert.match(migration, /function public\.form_rate_limit/);
  assert.match(migration, /'push_subscribe'/);
  assert.match(migration, /function public\.push_subscription_register/);
  assert.match(migration, /auth\.uid\(\)\) is null or not public\.is_member_active\(\)/);
  assert.match(migration, /grant execute on function public\.push_subscription_register/);

  assert.match(prompt, /auth\.getUser\(\)/, 'prompt only asks signed-in members');
  assert.match(prompt, /pushManager\.getSubscription/, 'existing subscriptions are reused');
  assert.doesNotMatch(layout, /<NotificationPrompt \/>/, "do not offer push until delivery is verified");
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
