import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const header = new URL('../apps/main/components/site-header.tsx', import.meta.url);
const navigation = new URL('../apps/main/lib/mobile-navigation.ts', import.meta.url);

test('Gallery is reachable from the desktop More menu', async () => {
  const source = await readFile(header, 'utf8');
  assert.match(source, /DESKTOP_GROUPS/);
  assert.match(source, /\["\/gallery",\s*"Gallery"\]/);
});

test('Gallery is reachable from the mobile drawer and footer quick links', async () => {
  const source = await readFile(navigation, 'utf8');
  assert.match(source, /\["\/gallery",\s*"Gallery"\]/);
});
