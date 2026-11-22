import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.mts', '.md', '.ts', '.tsx', '.txt']);
const privateAddress = /info\.epelawa@gmail\.com/i;

async function textFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === '.git') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await textFiles(file));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(file);
  }
  return files;
}

test('web apps keep Coming Soon labels limited to explicit unavailable-state disclosures', async () => {
  const files = await textFiles(appsRoot);
  const allowed = new Set([
    'admin/components/admin-sidebar.tsx',
    'main/app/about/page.tsx',
    'main/app/auth/auth-forms.tsx',
    'main/app/contact/page.tsx',
    'main/app/guidelines/page.tsx',
    'main/app/terms/page.tsx',
    'main/components/admin-login-form.tsx',
  ]);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const relative = path.relative(appsRoot, file);
    if (!allowed.has(relative)) assert.doesNotMatch(source, /coming\s+soon/i, relative);
  }
});

test('the shared contact inbox lives only in the central site-identity module', async () => {
  const allowed = new Set(['main/lib/site-identity.ts']);
  const files = await textFiles(appsRoot);
  for (const file of files) {
    const relative = path.relative(appsRoot, file);
    const source = await readFile(file, 'utf8');
    if (allowed.has(relative)) continue;
    assert.doesNotMatch(source, privateAddress, relative);
  }
  const identity = await readFile(path.join(appsRoot, 'main/lib/site-identity.ts'), 'utf8');
  assert.match(identity, privateAddress);
});
