import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const siteModule = new URL('../apps/main/lib/site.ts', import.meta.url).href;

function evaluateIndexing(extraEnv = {}) {
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--input-type=module',
    '-e',
    `import { isIndexingAllowed } from ${JSON.stringify(siteModule)}; process.stdout.write(isIndexingAllowed() ? 'true' : 'false');`,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: 'https://epelawa.ng',
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

test('explicit indexing override remains intentional and takes precedence over preview guard', () => {
  assert.equal(evaluateIndexing({ ALLOW_INDEXING: 'true' }), 'true');
  assert.equal(evaluateIndexing({ ALLOW_INDEXING: 'false' }), 'false');
});
