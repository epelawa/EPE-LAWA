import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const throttle = await import("../apps/admin/lib/signin-throttle.ts");

const SECRET = "s".repeat(40);
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

test("gate asks the database for the lock, sending only the HMAC key with the service role", async () => {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const req = new Request(input, init);
    const body = await req.json();
    calls.push({ path: new URL(req.url).pathname, body, apikey: req.headers.get("apikey") });
    return Response.json(body.p_account_key === throttle.signinAccountKey("locked@example.com", SECRET) ? 840 : 0);
  };
  await withEnv(configured, fetchImpl, async () => {
    assert.deepEqual(await throttle.signinAccountGate("open@example.com"), { allowed: true });
    assert.deepEqual(await throttle.signinAccountGate("LOCKED@example.com"), { allowed: false, reason: "locked", retryAfterSeconds: 840 });
  });
  assert.equal(calls[0].path, "/rest/v1/rpc/signin_throttle_status");
  assert.equal(calls[0].apikey, "service-test-only");
  for (const call of calls) {
    assert.deepEqual(Object.keys(call.body), ["p_account_key"]);
    assert.doesNotMatch(JSON.stringify(call.body), /@/);
  }
});

test("on Vercel the gate fails closed when it cannot check; locally it stays usable", async () => {
  const broken = async () => Response.json({ message: "boom", code: "XX000" }, { status: 500 });
  await withEnv(configured, broken, async () => {
    assert.deepEqual(await throttle.signinAccountGate("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ ...configured, SUPABASE_SERVICE_ROLE_KEY: "" }, null, async () => {
    assert.deepEqual(await throttle.signinAccountGate("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ ...configured, FORM_RATE_SECRET: "too-short" }, null, async () => {
    assert.deepEqual(await throttle.signinAccountGate("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: "http://insecure.example.invalid" }, null, async () => {
    assert.deepEqual(await throttle.signinAccountGate("a@example.com"), { allowed: false, reason: "unavailable" });
  });
  await withEnv({ FORM_RATE_SECRET: SECRET }, null, async () => {
    assert.deepEqual(await throttle.signinAccountGate("a@example.com"), { allowed: true }, "local development without Vercel");
  });
});

test("recording returns the lock length and never throws", async () => {
  const bodies = [];
  await withEnv(configured, async (input, init) => {
    const req = new Request(input, init);
    bodies.push({ path: new URL(req.url).pathname, body: await req.json() });
    return Response.json(bodies.at(-1).body.p_succeeded ? 0 : 900);
  }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", false), 900);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", true), 0);
  });
  assert.equal(bodies[0].path, "/rest/v1/rpc/signin_throttle_record");
  assert.deepEqual(bodies.map((b) => b.body.p_succeeded), [false, true]);
  await withEnv(configured, async () => { throw new Error("offline"); }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", false), 0);
  });
});

test("lock message gives minutes, not seconds, and the reset route", () => {
  assert.equal(throttle.signinLockedMessage(900), "Too many unsuccessful sign-in attempts for this email. Try again in about 15 minutes, or reset your password.");
  assert.match(throttle.signinLockedMessage(30), /about a minute/);
  assert.match(throttle.signinLockedMessage(61), /about 2 minutes/);
});

test("member sign-in: lock checked before the network budget, only wrong passwords counted, success and reset clear it", async () => {
  const src = await read("frontend/apps/main/app/auth/actions.ts");
  const signIn = src.slice(src.indexOf("export async function signIn("), src.indexOf("export async function requestPasswordReset("));
  assert.ok(signIn.indexOf("signinAccountGate(email)") > 0);
  assert.ok(signIn.indexOf("signinAccountGate(email)") < signIn.indexOf('formRateAllowance("auth_signin"'), "a locked email does not spend the network budget");
  assert.ok(signIn.indexOf('formRateAllowance("auth_signin"') < signIn.indexOf("signInWithPassword"));
  assert.match(signIn, /error\.code === "invalid_credentials"\) \{\s*const lockedFor = await recordSigninOutcome\(email, false\)/);
  assert.equal((signIn.match(/recordSigninOutcome\(email, false\)/g) ?? []).length, 1, "outages and provider rate limits are not counted as guesses");
  assert.ok(signIn.lastIndexOf("recordSigninOutcome(email, true)") < signIn.indexOf('redirect("/dashboard")'), "success is recorded before the redirect throws");
  const update = src.slice(src.indexOf("export async function updatePassword("), src.indexOf("export async function verifyEmailOtp("));
  assert.ok(update.indexOf("updateUser({ password })") < update.indexOf("recordSigninOutcome(user.email, true)"), "only a completed reset lifts the lock");
});

test("staff sign-in shares the same lock and counts only provider-confirmed outcomes", async () => {
  const src = await read("frontend/apps/admin/lib/login-actions.ts");
  assert.ok(src.indexOf("signinAccountGate(email)") < src.indexOf("signInAdminWithPassword(email, password"), "lock checked before the password is sent");
  assert.match(src, /result\.password !== "unknown"/);
  assert.match(src, /recordSigninOutcome\(email, result\.password === "verified"\)/);
  assert.ok(src.indexOf("recordSigninOutcome") < src.indexOf("redirect(safeAdminNextPath"));
});
