import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../apps/main/app/about/page.tsx', import.meta.url);
const styles = new URL('../apps/main/app/about/about.module.css', import.meta.url);

test('About page presents the approved public-information paths without invented claims', async () => {
  const source = await readFile(page, 'utf8');
  for (const href of ['/news', '/itan-ilu-mi', '/tourism', '/business-directory', '/forum', '/radio', '/guidelines', '/privacy', '/contact']) {
    assert.ok(source.includes(`href: "${href}"`) || source.includes(`href="${href}"`), href);
  }
  assert.match(source, /approved records/i);
  assert.match(source, /Editorial staff details will appear here once confirmed/i);
  assert.match(source, /does not receive or store messages/i);
  assert.match(source, /Correction requests/);
  assert.match(source, /EnquiryForm kind="correction"/);
  assert.doesNotMatch(source, /Coming Soon/);
  assert.doesNotMatch(source, /not available yet/);
});

test('About page uses responsive cards and reduced-motion-safe interaction', async () => {
  const source = await readFile(styles, 'utf8');
  assert.ok(source.includes('grid-template-columns: repeat(3'), 'desktop card grid');
  assert.ok(source.includes('@media (max-width: 480px)'), 'mobile card grid');
  assert.ok(source.includes('prefers-reduced-motion: reduce'), 'reduced motion');
  assert.ok(source.includes('focus-visible'), 'keyboard focus');
});
