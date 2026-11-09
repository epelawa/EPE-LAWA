import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  probeConnection,
  nextProbeDelay,
} from '../apps/main/lib/connectivity.ts';

test('a browser that reports offline is believed without a probe', async () => {
  let calls = 0;
  const result = await probeConnection(false, async () => {
    calls++;
    return { ok: true, status: 200 };
  });
  assert.equal(result, 'offline');
  assert.equal(calls, 0);
});

test('a resolved response proves reachability, and only 5xx means unavailable', async () => {
  assert.equal(await probeConnection(true, async () => ({ ok: true, status: 200 })), 'online');
  // A 404 means the server answered. That is not an outage, and claiming it was
  // would be the same class of lie as claiming a connection we never measured.
  assert.equal(await probeConnection(true, async () => ({ ok: false, status: 404 })), 'online');
  assert.equal(await probeConnection(true, async () => ({ ok: false, status: 503 })), 'unavailable');
});

test('a request that never completes is reported as offline', async () => {
  assert.equal(
    await probeConnection(true, async () => {
      throw new Error('network');
    }),
    'offline',
  );
});

test('a probe that crosses the slow threshold reports slow once and still resolves', async () => {
  let slow = 0;
  const result = await probeConnection(
    true,
    () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200 }), 30)),
    { slowMs: 10, onSlow: () => { slow++; } },
  );
  assert.equal(result, 'online');
  assert.equal(slow, 1);
});

test('a probe that never settles is abandoned as inconclusive, not guessed', async () => {
  const started = Date.now();
  const result = await probeConnection(true, () => new Promise(() => {}), { timeoutMs: 20 });
  assert.equal(result, 'inconclusive');
  assert.ok(Date.now() - started < 2000, 'the timeout must settle the probe');
});

test('retry backoff grows, caps at 60s, and jitters by ±20%', () => {
  assert.equal(nextProbeDelay(0, () => 0.5), 4000);
  assert.equal(nextProbeDelay(1, () => 0.5), 8000);
  assert.equal(nextProbeDelay(2, () => 0.5), 16000);
  assert.equal(nextProbeDelay(4, () => 0.5), 60000);
  assert.equal(nextProbeDelay(12, () => 0.5), 60000, 'never exceeds the cap');
  assert.equal(nextProbeDelay(0, () => 0), 3200, '-20%');
  assert.equal(nextProbeDelay(0, () => 1), 4800, '+20%');
});

test('custom pull-to-refresh code and cue are absent from the public app', async () => {
  const component = await readFile(new URL('../apps/main/app/connectivity.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../apps/main/app/globals.css', import.meta.url), 'utf8');
  const staffStyles = await readFile(new URL('../apps/admin/app/globals.css', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /touchstart|touchmove|pull-cue|isPullRefresh|reason === "pull"/i);
  assert.doesNotMatch(styles, /\.pull-cue/);
  assert.match(styles, /html\s*\{\s*overscroll-behavior-y:\s*none;/);
  assert.match(staffStyles, /html\s*\{\s*overscroll-behavior-y:\s*none;/);
  assert.doesNotMatch(styles, /body\s*\{[^}]*overflow(?:-y)?:\s*hidden/s);
  assert.doesNotMatch(staffStyles, /body\s*\{[^}]*overflow(?:-y)?:\s*hidden/s);
});
