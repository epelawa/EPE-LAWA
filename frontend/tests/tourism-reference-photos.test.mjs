import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../apps/main/app/tourism/page.tsx', import.meta.url);

test('Tourism photo credits stay compact and keep required attribution', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /Iberekodo Beach, Epe, Lagos/);
  assert.match(source, /Tarikhaldun/);
  assert.match(source, /CC BY-SA 4\.0/);
  assert.match(source, /href="\/photo-credits"/);
  assert.doesNotMatch(source, /Wikimedia Commons title:/);
  assert.doesNotMatch(source, /Photograph by Dotun55 \(Adedotun Ajibade\)\.\s*<\/span>\s*<span>Source:/);
  assert.doesNotMatch(source, /do not verify access, amenities/);
  assert.doesNotMatch(source, /full source aspect ratios/);
});

test('Tourism still shows an honest failed state for unverified destinations', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /Destinations could not be loaded/);
  assert.match(source, /We are not showing unverified destination information/);
});
