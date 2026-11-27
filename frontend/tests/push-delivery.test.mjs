import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  webPushVapidJwt,
  webPushEncrypt,
  pushSenderReady,
  pushDispatchAuthorized,
  pushServiceUrl,
} from '../apps/main/lib/web-push-send.ts';
import { createECDH, createDecipheriv, createPublicKey, hkdfSync, randomBytes, verify as cryptoVerify } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const b64u = (buffer) => Buffer.from(buffer).toString('base64url');
const fromB64u = (value) => Buffer.from(value, 'base64url');

function makeVapidKeyPair() {
  const ec = createECDH('prime256v1');
  ec.generateKeys();
  const pub = ec.getPublicKey();
  let priv = ec.getPrivateKey();
  if (priv.length < 32) priv = Buffer.concat([Buffer.alloc(32 - priv.length), priv]);
  return { publicKey: b64u(pub), privateKey: b64u(priv) };
}

test('a VAPID jwt is ES256, audience-bound, expiring in 12h and signature-verifiable', () => {
  const keys = makeVapidKeyPair();
  const now = 1700000000000;
  const token = webPushVapidJwt('https://fcm.googleapis.com', 'mailto:info.epelawa@gmail.com', keys.publicKey, keys.privateKey, now);
  const [head, body, signature] = token.split('.');
  assert.equal(token.split('.').length, 3);
  assert.deepEqual(JSON.parse(fromB64u(head).toString('utf8')), { typ: 'JWT', alg: 'ES256' });
  const claims = JSON.parse(fromB64u(body).toString('utf8'));
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.equal(claims.sub, 'mailto:info.epelawa@gmail.com');
  assert.equal(claims.exp, Math.floor(now / 1000) + 12 * 60 * 60);
  const signatureBytes = fromB64u(signature);
  assert.equal(signatureBytes.length, 64, 'raw r||s, not DER');
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64u(fromB64u(keys.publicKey).subarray(1, 33)),
    y: b64u(fromB64u(keys.publicKey).subarray(33, 65)),
  };
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  assert.equal(cryptoVerify('sha256', Buffer.from(`${head}.${body}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, signatureBytes), true);
});

test('vapid input validation rejects weak keys and insecure audiences', () => {
  const keys = makeVapidKeyPair();
  assert.throws(() => webPushVapidJwt('http://fcm.googleapis.com', 'mailto:x@y.z', keys.publicKey, keys.privateKey), /audience/);
  assert.throws(() => webPushVapidJwt('https://fcm.googleapis.com', '', keys.publicKey, keys.privateKey), /subject/);
  assert.throws(() => webPushVapidJwt('https://fcm.googleapis.com', 'mailto:x@y.z', 'not-a-key', keys.privateKey), /public key/);
  assert.throws(() => webPushVapidJwt('https://fcm.googleapis.com', 'mailto:x@y.z', keys.publicKey, 'AAAA'), /private key/);
});

// Receiver-side mirror of RFC 8291 aes128gcm used to prove the ciphertext is honest.
function decryptPush(pushBody, receiver, authSecret) {
  const header = pushBody.subarray(0, 21);
  const salt = header.subarray(0, 16);
  const rs = header.readUInt32BE(16);
  const keyIdLength = header[20];
  const serverPublicKey = pushBody.subarray(21, 21 + keyIdLength);
  assert.equal(rs, 4096);
  assert.equal(keyIdLength, 65);
  const shared = receiver.computeSecret(serverPublicKey);
  const info = Buffer.concat([Buffer.from('WebPush: info\0', 'binary'), receiver.getPublicKey(), serverPublicKey]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, info, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'binary'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'binary'), 12));
  const ciphertext = pushBody.subarray(21 + keyIdLength);
  const gcm = createDecipheriv('aes-128-gcm', cek, nonce);
  gcm.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plaintext = Buffer.concat([gcm.update(ciphertext.subarray(0, ciphertext.length - 16)), gcm.final()]);
  assert.equal(plaintext[plaintext.length - 1], 0x02, 'single record terminates with the 0x02 padding mark');
  return plaintext.subarray(0, plaintext.length - 1).toString('utf8');
}

test('aes128gcm bodies decrypt to the exact payload with the real receiver secret', () => {
  const receiver = createECDH('prime256v1');
  receiver.generateKeys();
  const authSecret = randomBytes(16);
  const payload = { title: 'New story', body: 'Epe news is out.', kind: 'news_published', url: '/news/epe-market' };
  const body = webPushEncrypt(b64u(receiver.getPublicKey()), b64u(authSecret), payload);
  assert.equal(decryptPush(body, receiver, authSecret), JSON.stringify(payload));
});

test('aes128gcm validation rejects malformed keys and oversized payloads', () => {
  const receiver = createECDH('prime256v1');
  receiver.generateKeys();
  const auth = b64u(randomBytes(16));
  assert.throws(() => webPushEncrypt('AAAA', auth, { title: 't', body: 'b', kind: 'k' }), /p256dh/);
  assert.throws(() => webPushEncrypt(b64u(receiver.getPublicKey()), 'short', { title: 't', body: 'b', kind: 'k' }), /auth/);
  const payload = { title: 't', body: 'x'.repeat(4200), kind: 'k' };
  assert.throws(() => webPushEncrypt(b64u(receiver.getPublicKey()), auth, payload), /too large/);
});

test('dispatch readiness and bearer checks fail closed', () => {
  const env = {
    NEXT_PUBLIC_WEB_PUSH_ENABLED: 'true',
    WEB_PUSH_VAPID_PUBLIC_KEY: 'k',
    WEB_PUSH_VAPID_PRIVATE_KEY: 's',
    WEB_PUSH_VAPID_SUBJECT: 'mailto:info.epelawa@gmail.com',
    PUSH_DISPATCH_SECRET: 'secret-secret-secret-secret-secret',
  };
  assert.equal(pushSenderReady(env), true);
  assert.equal(pushSenderReady({}), false);
  assert.equal(pushSenderReady({ ...env, NEXT_PUBLIC_WEB_PUSH_ENABLED: 'false' }), false);
  assert.equal(pushSenderReady({ ...env, PUSH_DISPATCH_SECRET: undefined }), false);

  assert.equal(pushDispatchAuthorized(null, env), false);
  assert.equal(pushDispatchAuthorized('Bearer wrong-wrong', env), false);
  assert.equal(pushDispatchAuthorized('Bearer secret-secret-secret-secret-secret', env), true);
  assert.equal(pushDispatchAuthorized('secret-secret-secret-secret-secret', env), false, 'bearer scheme required');
});

test('the dispatch route gates on the shared secret, validates kinds and relative urls, caps and retires', async () => {
  const route = await read('frontend/apps/main/app/api/push/dispatch/route.ts');
  // Turn 4: delivery moved to lib/push-fanout.ts so scheduled radio pushes share it; guests included.
  const fanout = await read('frontend/apps/main/lib/push-fanout.ts');
  assert.match(route, /fanoutPush\(/);
  assert.match(route, /pushDispatchAuthorized\(request\.headers\.get\("authorization"\)\)/);
  assert.match(route, /pushSenderReady\(\)/);
  assert.match(route, /news_published/, 'push_news');
  assert.match(route, /radio_live/, 'push_radio');
  assert.match(fanout, /MAX_DEVICES = 2000/);
  assert.match(fanout, /status === 404 \|\| status === 410/);
  assert.match(fanout, /\.delete\(\)\.eq\("id"/, 'gone subscriptions are retired');
  assert.match(fanout, /from\("notification_preferences"\)/);
  assert.match(fanout, /from\("push_subscriptions"\)/);
  assert.match(fanout, /from\("web_push_devices"\)/);
  assert.match(fanout, /openPushValue/, 'device keys are decrypted only at send time');
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /!url\.startsWith\("\/"\) \|\| url\.startsWith\("\/\/"\)/, 'urls are same-site relative paths only');
});

test('the newsroom publish hooks fire the dispatch after the article goes live', async () => {
  const actions = await read('frontend/apps/admin/lib/actions.ts');
  assert.match(actions, /from "\.\.\/\.\.\/main\/lib\/web-push-send"/);
  assert.match(actions, /pushSenderReady\(\)/);
  assert.match(actions, /after\(\(\) => dispatchNewsroomPush/);
  assert.match(actions, /kind: "news_published"/);
  assert.match(actions, /url: `\/news\/\$\{article\.slug\}`/);
});


test('push destinations are restricted to known providers and cannot use credentials or ports', () => {
  // jmt17.google.com is the endpoint Chrome handed the owner's phone (production push_subscriptions row, Nov 2026).
  for (const url of ['https://fcm.googleapis.com/fcm/send/test', 'https://jmt17.google.com/fcm/send/test', 'https://updates.push.services.mozilla.com/wpush/v2/test', 'https://web.push.apple.com/test', 'https://wns2-par02p.notify.windows.com/w/?token=abc']) assert.ok(pushServiceUrl(url), url);
  for (const url of ['https://localhost/', 'https://127.0.0.1/', 'https://evil.test/', 'https://fcm.googleapis.com.evil.test/', 'https://fcm.googleapis.com:8443/', 'https://user@fcm.googleapis.com/', 'http://fcm.googleapis.com/', 'https://evil.jmt17.google.com/fcm/send/x', 'https://jmt17.google.com.evil.test/', 'https://google.com/fcm/send/x', 'https://jmt18.google.com/fcm/send/x', 'https://notify.windows.com/w/', 'https://evil.notify.windows.com/w/', 'https://wns2-x.notify.windows.com.evil.test/']) assert.equal(pushServiceUrl(url), null, url);
});
