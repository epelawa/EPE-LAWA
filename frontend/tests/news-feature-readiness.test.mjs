import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../apps/main/', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('published News articles can be downloaded as safe offline HTML copies', async () => {
  const [status, news, article, download, downloadButton, exporter] = await Promise.all([
    text('components/news-feature-status.tsx'),
    text('app/news/page.tsx'),
    text('app/news/[slug]/page.tsx'),
    text('components/offline-article-download.tsx'),
    text('components/download-app-button.tsx'),
    text('lib/offline-article-copy.mjs'),
  ]);

  assert.match(status, /Available on article pages/);
  assert.match(status, /Push notifications are unavailable/i);
  assert.match(status, /will not request notification permission/i);
  assert.match(news, /NewsFeatureStatus/);
  assert.doesNotMatch(article, /NewsFeatureStatus/);
  assert.match(article, /OfflineArticleDownload/);
  assert.match(article, /data-offline-article-body/);
  assert.match(download, /innerText/);
  assert.match(download, /URL\.createObjectURL/);
  assert.match(download, /aria-live="polite"/);
  assert.match(exporter, /escapeHtml/);
  assert.match(exporter, /text only/);
  assert.doesNotMatch(exporter, /<script/i);
  assert.match(downloadButton, /Not on Play Store/);
  assert.doesNotMatch(status + downloadButton, /Coming\s+Soon/i);
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
