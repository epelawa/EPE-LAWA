import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../apps/main/', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('offline reading and web push are clearly Coming Soon, not claimed as ready', async () => {
  const [status, news, article, download, downloadButton] = await Promise.all([
    text('components/news-feature-status.tsx'),
    text('app/news/page.tsx'),
    text('app/news/[slug]/page.tsx'),
    text('components/download-app.tsx'),
    text('components/download-app-button.tsx'),
  ]);

  assert.match(status, /Coming Soon/);
  assert.match(status, /Offline article reading/);
  assert.match(status, /Opt-in push notifications/);
  assert.match(news, /NewsFeatureStatus/);
  assert.match(article, /NewsFeatureStatus/);
  assert.doesNotMatch(download + downloadButton, /Nothing is missing/i);
  assert.match(download + downloadButton, /not active yet/i);
});

test('unconfigured web push never asks permission and contains no fabricated VAPID key', async () => {
  const [vapid, prompt, layout] = await Promise.all([
    text('lib/vapid.ts'),
    text('components/notification-prompt.tsx'),
    text('app/layout.tsx'),
  ]);

  assert.match(vapid, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.match(vapid, /NEXT_PUBLIC_WEB_PUSH_ENABLED/);
  assert.doesNotMatch(vapid, /BGp7Y1q7/);
  assert.match(prompt, /if \(!WEB_PUSH_READY\)/);
  assert.doesNotMatch(layout, /import\s+NotificationPrompt|<NotificationPrompt/);
});
