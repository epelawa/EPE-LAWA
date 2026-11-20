import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const siteModule = new URL('../apps/main/lib/site.ts', import.meta.url).href;
// Node 22.23 refuses to strip types from a `-e` module (ERR_NO_TYPESCRIPT).
// tsx is already a repo devDependency; load its ESM loader explicitly so the
// .ts site module is exercised exactly as the app builds it.
const tsxLoader = fileURLToPath(import.meta.resolve('tsx'));

function evaluateIndexing(extraEnv = {}) {
  const result = spawnSync(process.execPath, [
    '--import', tsxLoader,
    '--input-type=module',
    '-e',
    `import { isIndexingAllowed } from ${JSON.stringify(siteModule)}; process.stdout.write(isIndexingAllowed() ? 'true' : 'false');`,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: 'https://epelawa.vercel.app',
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      ALLOW_INDEXING: '',
      ...extraEnv,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('Vercel preview stays noindex even when it inherits the production canonical URL', () => {
  assert.equal(evaluateIndexing(), 'false');
});

test('News uses the canonical site origin even if a legacy separate-host variable is present', () => {
  const result = spawnSync(process.execPath, [
    '--import', tsxLoader,
    '--input-type=module',
    '-e',
    `import { newsUrl, siteUrl } from ${JSON.stringify(siteModule)}; process.stdout.write(siteUrl + '\\n' + newsUrl);`,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: 'https://epelawa.vercel.app',
      NEXT_PUBLIC_NEWS_URL: 'https://news.epelawa.ng',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), ['https://epelawa.vercel.app', 'https://epelawa.vercel.app']);
});

test('explicit indexing override remains intentional and takes precedence over preview guard', () => {
  assert.equal(evaluateIndexing({ ALLOW_INDEXING: 'true' }), 'true');
  assert.equal(evaluateIndexing({ ALLOW_INDEXING: 'false' }), 'false');
});
