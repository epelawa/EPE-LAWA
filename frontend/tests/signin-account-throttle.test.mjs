import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const throttle = await import("../apps/admin/lib/signin-throttle.ts");

const SECRET = "s".repeat(40);
const RESERVATION = "0b6f1c1e-3c55-4d8e-9a43-6f0d2b7a9e11";
const ENV_KEYS = ["FORM_RATE_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL"];

async function withEnv(env, fetchImpl, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  const oldFetch = globalThis.fetch;
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  if (fetchImpl) globalThis.fetch = fetchImpl;
  try { return await fn(); } finally {
    globalThis.fetch = oldFetch;
    for (const k of ENV_KEYS) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  }
}
const configured = { FORM_RATE_SECRET: SECRET, NEXT_PUBLIC_SUPABASE_URL: "https://unit.example.invalid", SUPABASE_SERVICE_ROLE_KEY: "service-test-only", VERCEL: "1" };

test("account key is a domain-separated HMAC of the normalised email and never the email itself", () => {
  const key = throttle.signinAccountKey("  Staff@Example.COM ", SECRET);
  assert.equal(key, createHmac("sha256", SECRET).update("signin-account:v1:staff@example.com").digest("hex"));
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(throttle.signinAccountKey("staff@example.com", SECRET), key, "case and whitespace do not create a second bucket");
  assert.notEqual(throttle.signinAccountKey("other@example.com", SECRET), key);
  // Not the same digest the network limiter would produce for the same input.
  assert.notEqual(key, createHmac("sha256", SECRET).update("staff@example.com").digest("hex"));
  assert.equal(throttle.signinAccountKey("staff@example.com", "short"), null);
  assert.equal(throttle.signinAccountKey("staff@example.com", ""), null);
});

test("admission reserves through the database, sending only the HMAC key with the service role", async () => {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const req = new Request(input, init);
    const body = await req.json();
    calls.push({ path: new URL(req.url).pathname, body, apikey: req.headers.get("apikey") });
    if (body.p_account_key === throttle.signinAccountKey("locked@example.com", SECRET)) return Response.json({ locked: 840 });
    if (body.p_account_key === throttle.signinAccountKey("busy@example.com", SECRET)) return Response.json({ busy: 30 });
    return Response.json({ admitted: true, reservation: RESERVATION });
  };
  await withEnv(configured, fetchImpl, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("open@example.com"), { allowed: true, reservation: RESERVATION });
    assert.deepEqual(await throttle.admitSigninAttempt("LOCKED@example.com"), { allowed: false, reason: "locked", retryAfterSeconds: 840 });
    assert.deepEqual(await throttle.admitSigninAttempt("busy@example.com"), { allowed: false, reason: "busy", retryAfterSeconds: 30 });
  });
  assert.equal(calls[0].path, "/rest/v1/rpc/signin_throttle_admit");
  assert.equal(calls[0].apikey, "service-test-only");
  for (const call of calls) {
    assert.deepEqual(Object.keys(call.body), ["p_account_key"]);
    assert.doesNotMatch(JSON.stringify(call.body), /@/);
  }
});

test("on Vercel the gate fails closed when it cannot check; locally it stays usable", async () => {
  const broken = async () => Response.json({ message: "boom", code: "XX000" }, { status: 500 });
  await withEnv(configured, broken, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  for (const reply of [{ capacity: true }, { admitted: true, reservation: "not-a-uuid" }, { locked: -5 }, 0, null]) {
    await withEnv(configured, async () => Response.json(reply), async () => {
      assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: false, reason: "unavailable" }, JSON.stringify(reply));
    });
  }
  await withEnv({ ...configured, SUPABASE_SERVICE_ROLE_KEY: "" }, null, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ ...configured, FORM_RATE_SECRET: "too-short" }, null, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: "http://insecure.example.invalid" }, null, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ FORM_RATE_SECRET: SECRET }, null, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: true, reservation: null }, "local development without Vercel");
  });
});

test("recording returns the lock length and never throws", async () => {
  const bodies = [];
  await withEnv(configured, async (input, init) => {
    const req = new Request(input, init);
    bodies.push({ path: new URL(req.url).pathname, body: await req.json() });
    return Response.json(bodies.at(-1).body.p_outcome === "rejected" ? 900 : 0);
  }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "rejected", RESERVATION), 900);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "unknown", RESERVATION), 0);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "verified"), 0);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "rejected", null), 0, "no reservation, nothing to close");
  });
  assert.equal(bodies[0].path, "/rest/v1/rpc/signin_throttle_record");
  assert.deepEqual(bodies.map((b) => [b.body.p_outcome, b.body.p_reservation]), [["rejected", RESERVATION], ["unknown", RESERVATION], ["verified", null]]);
  await withEnv(configured, async () => { throw new Error("offline"); }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "rejected", RESERVATION), 0);
  });
});

test("lock message gives minutes, not seconds, and the reset route", () => {
  assert.equal(throttle.signinLockedMessage(900), "Too many unsuccessful sign-in attempts for this email. Try again in about 15 minutes, or reset your password.");
  assert.match(throttle.signinLockedMessage(30), /about a minute/);
  assert.match(throttle.signinLockedMessage(61), /about 2 minutes/);
});

test("busy message explains that checks are still running, without claiming a lock", () => {
  assert.equal(throttle.signinBusyMessage(30), "Several sign-in attempts for this email are still being checked. Try again in about a minute.");
});

test("member sign-in: one normalised email, a slot reserved first, and every path closes the attempt", async () => {
  const src = await read("frontend/apps/main/app/auth/actions.ts");
  const signIn = src.slice(src.indexOf("export async function signIn("), src.indexOf("export async function requestPasswordReset("));
  assert.match(signIn, /const email = normaliseSigninEmail\(field\(data, "email"\)\)/);
  assert.ok(signIn.indexOf('formRateAllowance("auth_signin"') > 0);
  assert.ok(signIn.indexOf('formRateAllowance("auth_signin"') < signIn.indexOf("admitSigninAttempt(email)"), "a network-refused caller writes nothing to the per-account table");
  assert.ok(signIn.indexOf("admitSigninAttempt(email)") < signIn.indexOf("signInWithPassword({ email, password })"), "the provider gets the same normalised email");
  assert.match(signIn, /error\.code === "invalid_credentials"\) \{\s*const lockedFor = await close\("rejected"\)/);
  assert.equal((signIn.match(/close\("rejected"\)/g) ?? []).length, 1, "only a confirmed wrong password counts");
  assert.match(signIn, /email_not_confirmed[\s\S]*?close\("verified"\)/);
  assert.match(signIn, /safeAuthNext\(field\(data, "next"\) \|\| null\)/, "return targets are normalized before sign-in");
  assert.ok(signIn.lastIndexOf('close("verified")') < signIn.indexOf("redirect(nextPath)"), "success is recorded before the redirect throws");
  assert.match(signIn, /if \(!closed\) await close\("unknown"\)/, "a thrown provider call releases the slot");
  assert.match(signIn, /recordSigninOutcome\(email, outcome, gate\.reservation\)/, "each outcome closes its own reservation");
  assert.match(signIn, /gate\.reason === "busy"\) return \{ status: "error", message: signinBusyMessage/);
  const update = src.slice(src.indexOf("export async function updatePassword("), src.indexOf("export async function verifyEmailOtp("));
  assert.ok(update.indexOf("updateUser({ password })") < update.indexOf('recordSigninOutcome(user.email, "verified")'), "a completed reset lifts the lock");
  const otp = src.slice(src.indexOf("export async function verifyEmailOtp("), src.indexOf("export async function signOut("));
  assert.match(otp, /if \("redirectTo" in outcome\) \{\s*\/\/[^\n]*\n\s*await recordSigninOutcome\(normaliseSigninEmail\(field\(data, "email"\)\), "verified"\)/, "only a verified emailed code lifts the lock");
});

test("staff sign-in normalises once, reserves before the password grant, and always closes the attempt", async () => {
  const src = await read("frontend/apps/admin/lib/login-actions.ts");
  assert.match(src, /const email = typeof emailValue === "string" \? normaliseSigninEmail\(emailValue\) : null/);
  assert.ok(src.indexOf("await cookies()") < src.indexOf("admitSigninAttempt(email)"), "nothing that can throw sits between admission and recording");
  assert.ok(src.indexOf('formRateAllowance("auth_signin", 15)') > 0, "staff sign-in shares the member per-network budget");
  assert.ok(src.indexOf('formRateAllowance("auth_signin", 15)') < src.indexOf("admitSigninAttempt(email)"), "the network budget is spent before any row is written");
  assert.ok(src.indexOf("admitSigninAttempt(email)") < src.indexOf("signInAdminWithPassword(email, password"));
  assert.match(src, /recordSigninOutcome\(email, result\.password, gate\.reservation\)/);
  assert.ok(src.indexOf("recordSigninOutcome") < src.indexOf("redirect(safeAdminNextPath"));
});
