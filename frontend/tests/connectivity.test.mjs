import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  probeConnection,
  isPullRefreshEnabled,
  isPullRefreshGesture,
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

test('pull refresh requires a deliberate mostly vertical downward gesture', () => {
  assert.equal(isPullRefreshGesture(0, 80), true);
  assert.equal(isPullRefreshGesture(5, 79), false);
  assert.equal(isPullRefreshGesture(70, 90), false);
  assert.equal(isPullRefreshGesture(0, -100), false);
});

test('custom pull refresh is disabled on the landing page and unknown paths', () => {
  assert.equal(isPullRefreshEnabled('/'), false);
  assert.equal(isPullRefreshEnabled(null), false);
  assert.equal(isPullRefreshEnabled(''), false);
  assert.equal(isPullRefreshEnabled('/about'), true);
  assert.equal(isPullRefreshEnabled('/status/404'), true);
});
