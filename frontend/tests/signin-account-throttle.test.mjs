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

test("admission reserves through the database, sending only the HMAC key with the service role", async () => {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const req = new Request(input, init);
    const body = await req.json();
    calls.push({ path: new URL(req.url).pathname, body, apikey: req.headers.get("apikey") });
    return Response.json(body.p_account_key === throttle.signinAccountKey("locked@example.com", SECRET) ? 840 : 0);
  };
  await withEnv(configured, fetchImpl, async () => {
    assert.deepEqual(await throttle.admitSigninAttempt("open@example.com"), { allowed: true });
    assert.deepEqual(await throttle.admitSigninAttempt("LOCKED@example.com"), { allowed: false, reason: "locked", retryAfterSeconds: 840 });
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
    assert.deepEqual(await throttle.admitSigninAttempt("a@example.com"), { allowed: true }, "local development without Vercel");
  });
});

test("recording returns the lock length and never throws", async () => {
  const bodies = [];
  await withEnv(configured, async (input, init) => {
    const req = new Request(input, init);
    bodies.push({ path: new URL(req.url).pathname, body: await req.json() });
    return Response.json(bodies.at(-1).body.p_outcome === "rejected" ? 900 : 0);
  }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "rejected"), 900);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "unknown"), 0);
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "verified"), 0);
  });
  assert.equal(bodies[0].path, "/rest/v1/rpc/signin_throttle_record");
  assert.deepEqual(bodies.map((b) => b.body.p_outcome), ["rejected", "unknown", "verified"]);
  await withEnv(configured, async () => { throw new Error("offline"); }, async () => {
    assert.equal(await throttle.recordSigninOutcome("a@example.com", "rejected"), 0);
  });
});

test("lock message gives minutes, not seconds, and the reset route", () => {
  assert.equal(throttle.signinLockedMessage(900), "Too many unsuccessful sign-in attempts for this email. Try again in about 15 minutes, or reset your password.");
  assert.match(throttle.signinLockedMessage(30), /about a minute/);
  assert.match(throttle.signinLockedMessage(61), /about 2 minutes/);
});

test("member sign-in: one normalised email, a slot reserved first, and every path closes the attempt", async () => {
  const src = await read("frontend/apps/main/app/auth/actions.ts");
  const signIn = src.slice(src.indexOf("export async function signIn("), src.indexOf("export async function requestPasswordReset("));
  assert.match(signIn, /const email = normaliseSigninEmail\(field\(data, "email"\)\)/);
  assert.ok(signIn.indexOf("admitSigninAttempt(email)") > 0);
  assert.ok(signIn.indexOf("admitSigninAttempt(email)") < signIn.indexOf('formRateAllowance("auth_signin"'));
  assert.ok(signIn.indexOf('formRateAllowance("auth_signin"') < signIn.indexOf("signInWithPassword({ email, password })"), "the provider gets the same normalised email");
  const limiterRefusal = signIn.slice(signIn.indexOf('formRateAllowance("auth_signin"'), signIn.indexOf("try {"));
  assert.match(limiterRefusal, /close\("unknown"\)/, "a network-limiter refusal gives the slot back");
  assert.match(signIn, /error\.code === "invalid_credentials"\) \{\s*const lockedFor = await close\("rejected"\)/);
  assert.equal((signIn.match(/close\("rejected"\)/g) ?? []).length, 1, "only a confirmed wrong password counts");
  assert.match(signIn, /email_not_confirmed[\s\S]*?close\("verified"\)/);
  assert.ok(signIn.lastIndexOf('close("verified")') < signIn.indexOf('redirect("/dashboard")'), "success is recorded before the redirect throws");
  assert.match(signIn, /if \(!closed\) await close\("unknown"\)/, "a thrown provider call releases the slot");
  const update = src.slice(src.indexOf("export async function updatePassword("), src.indexOf("export async function verifyEmailOtp("));
  assert.ok(update.indexOf("updateUser({ password })") < update.indexOf('recordSigninOutcome(user.email, "verified")'), "only a completed reset lifts the lock");
});

test("staff sign-in normalises once, reserves before the password grant, and always closes the attempt", async () => {
  const src = await read("frontend/apps/admin/lib/login-actions.ts");
  assert.match(src, /const email = typeof emailValue === "string" \? normaliseSigninEmail\(emailValue\) : null/);
  assert.ok(src.indexOf("await cookies()") < src.indexOf("admitSigninAttempt(email)"), "nothing that can throw sits between admission and recording");
  assert.ok(src.indexOf("admitSigninAttempt(email)") < src.indexOf("signInAdminWithPassword(email, password"));
  assert.match(src, /recordSigninOutcome\(email, result\.password\)/);
  assert.ok(src.indexOf("recordSigninOutcome") < src.indexOf("redirect(safeAdminNextPath"));
});
