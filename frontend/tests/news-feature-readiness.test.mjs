import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../apps/main/', import.meta.url);
async function text(path) { return readFile(new URL(path, root), 'utf8'); }

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
  assert.doesNotMatch(news, /NewsFeatureStatus/);
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

test('article body comes only from the RLS-visible current published version, not a missing view column', async () => {
  const [article, migration] = await Promise.all([
    text('app/news/[slug]/page.tsx'),
    readFile(new URL('../../../backend/supabase/migrations/20261102190002_editorial_core.sql', root), 'utf8'),
  ]);
  assert.match(article, /from\("published_articles"\)/);
  assert.match(article, /from\("article_versions"\)\.select\("body"\)/);
  assert.match(article, /\.eq\("article_id", article\.id\)/);
  assert.doesNotMatch(article, /published_articles"\)\.select\([^)]*body/);
  assert.match(migration, /using\s*\([\s\S]*?a\.published_version_id\s*=\s*article_versions\.id/);
});

test('News metadata, compact share actions and related cards use the canonical slug route', async () => {
  const [article, share, urls] = await Promise.all([
    text('app/news/[slug]/page.tsx'),
    text('components/article-share-actions.tsx'),
    text('lib/news-urls.ts'),
  ]);
  assert.match(article, /canonical: articleUrl/);
  assert.match(article, /url: articleUrl/);
  assert.match(article, /publicNewsArticleUrl\(article\.slug\)/);
  assert.match(article, /newsArticlePath\(item\.slug\)/);
  assert.match(article, /ArticleShareActions title=\{article\.title\} url=\{articleUrl\}/);
  assert.match(article, /className=\{styles\.articleHeroCopy\}/);
  assert.doesNotMatch(article, /estimateReadMinutes|Published story|Share on WhatsApp/);
  assert.match(article, /Related stories/);
  assert.match(urls, /encodeURIComponent\(slug\)/);
  assert.match(urls, /absoluteUrl\(newsArticlePath\(slug\)\)/);
  assert.match(share, /navigator\.share\(\{ title, url \}\)/);
  assert.match(share, /navigator\.clipboard\?\.writeText/);
  assert.match(share, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(share, /Public article URL/);
  assert.doesNotMatch(article, /view_count|views_total|article\.id\}\s*\}\s*<\/a>/i);
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
