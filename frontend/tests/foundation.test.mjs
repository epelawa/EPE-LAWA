import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  return port;
}

async function startApp(app) {
  const port = await freePort();
  const cwd = path.join(root, 'frontend/apps', app);
  const next = path.join(cwd, 'node_modules/next/dist/bin/next');
  const child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out starting ${app}: ${output}`)), 15000);
      const fail = (error) => { clearTimeout(timeout); reject(error); };
      child.once('error', fail);
      child.once('exit', (code) => fail(new Error(`${app} exited with ${code}: ${output}`)));
      for (const stream of [child.stdout, child.stderr]) {
        stream.on('data', (data) => {
          output += data.toString();
          if (/Ready in/i.test(output)) { clearTimeout(timeout); resolve(); }
        });
      }
    });
  } catch (error) {
    child.kill();
    throw error;
  }
  return { child, base: `http://127.0.0.1:${port}` };
}

async function withApp(app, run) {
  const { child, base } = await startApp(app);
  try { await run(base); }
  finally {
    const finished = new Promise((resolve) => child.once('exit', resolve));
    child.kill('SIGTERM');
    await finished;
  }
}

for (const app of ['main', 'news']) {
  test(`${app} is honest about its unconnected content and excluded from indexing`, async () => {
    await withApp(app, async (base) => {
      const response = await fetch(base);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /not connected yet/i);
      assert.match(html, /noindex, nofollow/i);
    });
  });
}

test('admin remains unavailable and does not expose a dashboard', async () => {
  await withApp('admin', async (base) => {
    for (const pathname of ['/', '/login', '/dashboard', '/api/v1/articles']) {
      const response = await fetch(base + pathname);
      assert.equal(response.status, 503, pathname);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(await response.text(), /not available yet/i);
    }
    const response = await fetch(base + '/api/v1/articles', { method: 'POST' });
    assert.equal(response.status, 405);
  });
});
