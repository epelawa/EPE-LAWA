import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../apps/main/app/gallery/page.tsx', import.meta.url);
const styles = new URL('../apps/main/app/gallery/gallery.module.css', import.meta.url);

test('Gallery remains an honest empty state until media is approved', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /No photographs have been published/);
  assert.match(source, /licen[cs]e, source, credit/i);
  assert.match(source, /unverified or unlicensed material/i);
  assert.match(source, /honest empty state/i);
  assert.match(source, /href="\/photo-credits"/);
  assert.match(source, /href="\/tourism"/);
});

test('Gallery provides a responsive, reduced-motion-safe presentation', async () => {
  const source = await readFile(styles, 'utf8');
  assert.ok(source.includes('grid-template-columns: minmax(0, 1fr)'), 'wide split');
  assert.ok(source.includes('@media (max-width: 700px)'), 'mobile layout');
  assert.ok(source.includes('prefers-reduced-motion: reduce'), 'reduced motion');
  assert.ok(source.includes('focus-visible'), 'keyboard focus');
});
