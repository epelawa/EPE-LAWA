import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/main');
const appRoot = path.join(root, 'app');
const manifestPath = path.join(root, 'public/manus-routes.json');

async function pageFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await pageFiles(file));
    else if (entry.name === 'page.tsx') files.push(file);
  }
  return files;
}

function pageToRoute(file) {
  const relative = path.relative(appRoot, path.dirname(file)).split(path.sep)
    .filter((part) => !(part.startsWith('(') && part.endsWith(')')));
  if (relative.at(-1) === '[...unknown]') return null;
  const parts = relative.map((part) => {
    if (part.startsWith('[...') && part.endsWith(']')) return `:${part.slice(4, -1)}`;
    if (part.startsWith('[') && part.endsWith(']')) return `:${part.slice(1, -1)}`;
    return part;
  });
  return `/${parts.join('/')}`.replace(/^\/$/, '/') || '/';
}

test('public route manifest matches the Next page tree', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.deepEqual(Object.keys(manifest), ['routes']);
  assert.ok(Array.isArray(manifest.routes));

  const manifestPaths = manifest.routes.map((entry) => {
    assert.deepEqual(Object.keys(entry), ['path']);
    assert.match(entry.path, /^\/(?:[^\s?#]|\?[^\s#]|#[^\s])*$/);
    assert.doesNotMatch(entry.path, /^\/\/|https?:\/\/|\/api(?:\/|$)/);
    return entry.path;
  });
  assert.equal(new Set(manifestPaths).size, manifestPaths.length);
  assert.ok(manifestPaths.includes('/'));
  assert.ok(manifestPaths.includes('/news/:slug'));
  assert.ok(manifestPaths.includes('/advertise'));
  assert.ok(manifestPaths.includes('/admin/login'));

  const expectedPaths = (await pageFiles(appRoot)).map(pageToRoute).filter(Boolean).sort();
  assert.deepEqual([...manifestPaths].sort(), expectedPaths);
});
