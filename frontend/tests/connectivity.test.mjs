import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probeConnection, isPullRefreshGesture } from '../apps/main/lib/connectivity.ts';

test('connection engine distinguishes browser offline, a successful probe, and an unreachable service', async () => {
  let calls = 0;
  const good = async () => { calls++; return { ok: true }; };
  assert.equal(await probeConnection(false, good), 'offline');
  assert.equal(calls, 0);
  assert.equal(await probeConnection(true, good), 'online');
  assert.equal(await probeConnection(true, async () => ({ ok: false })), 'unreachable');
  assert.equal(await probeConnection(true, async () => { throw new Error('network'); }), 'unreachable');
});

test('pull refresh requires a deliberate mostly vertical downward gesture', () => {
  assert.equal(isPullRefreshGesture(0, 80), true);
  assert.equal(isPullRefreshGesture(5, 79), false);
  assert.equal(isPullRefreshGesture(70, 90), false);
  assert.equal(isPullRefreshGesture(0, -100), false);
});
