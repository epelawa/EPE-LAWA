import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfflineArticleHtml, offlineArticleFilename } from '../apps/main/lib/offline-article-copy.mjs';

const article = {
  slug: 'local-story/unsafe?name',
  title: 'Epe & its people <today>',
  summary: 'A source-backed story & summary.',
  publishedAt: '2026-10-01T12:00:00.000Z',
  author: 'EPE LAWA newsroom',
  category: 'Community',
  sourceUrl: 'https://epelawa.vercel.app/news/local-story',
};

test('offline copy is self-contained, text-only and escapes published content as HTML text', () => {
  const html = buildOfflineArticleHtml(article, 'First paragraph.\n\n<script>alert("x")</script> & second paragraph.');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /EPE LAWA · OFFLINE COPY/);
  assert.match(html, /Epe &amp; its people &lt;today&gt;/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; second paragraph\./);
  assert.match(html, /Images, later updates and corrections are not included/);
  assert.doesNotMatch(html, /<script\b|<img\b|<link\b|<iframe\b/i);
  assert.match(html, /Original story: https:\/\/epelawa\.vercel\.app\/news\/local-story/);
});

test('offline-copy filename strips path, query and unsafe characters', () => {
  const filename = offlineArticleFilename(article.slug);
  assert.equal(filename, 'epe-lawa-local-story-unsafe-name-offline.html');
  assert.doesNotMatch(filename, /[/?<>]/);
});
