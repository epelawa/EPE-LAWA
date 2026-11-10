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

test('web apps do not present Coming Soon placeholder labels', async () => {
  const files = await textFiles(appsRoot);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /coming\s+soon/i, path.relative(appsRoot, file));
  }
});

test('the protected primary-admin address is absent from public app source and static metadata', async () => {
  const files = await textFiles(path.join(appsRoot, 'main'));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, privateAddress, path.relative(appsRoot, file));
  }
});
