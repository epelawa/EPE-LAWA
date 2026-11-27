import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin;");
for (const migration of ["20261129000000_signin_account_throttle.sql", "20261129010000_signin_throttle_atomic_admission.sql"]) {
  await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
}

const key = (c) => c.repeat(64);
const admit = async (k) => (await db.query("select public.signin_throttle_admit($1) s", [k])).rows[0].s;
const record = async (k, outcome) => (await db.query("select public.signin_throttle_record($1,$2) s", [k, outcome])).rows[0].s;
const row = async (k) => (await db.query("select failures, locked_until from public.auth_signin_throttle where account_key=$1", [k])).rows[0];
const near15min = (s) => s > 890 && s <= 900;

test("only service_role can use the throttle; the read-only status function is gone", async () => {
  const { rows: [r] } = await db.query(`select
    has_function_privilege('anon','public.signin_throttle_admit(text)','execute') anon_admit,
    has_function_privilege('authenticated','public.signin_throttle_record(text,text)','execute') auth_record,
    has_table_privilege('anon','public.auth_signin_throttle','select') anon_read,
    has_function_privilege('service_role','public.signin_throttle_admit(text)','execute') svc_admit,
    has_function_privilege('service_role','public.signin_throttle_record(text,text)','execute') svc_record,
    to_regprocedure('public.signin_throttle_status(text)') is null status_dropped,
    to_regprocedure('public.signin_throttle_record(text,boolean)') is null old_record_dropped,
    (select bool_and(prosecdef) from pg_proc where proname in ('signin_throttle_admit','signin_throttle_record')) secdef`);
  assert.deepEqual(r, { anon_admit: false, auth_record: false, anon_read: false, svc_admit: true, svc_record: true, status_dropped: true, old_record_dropped: true, secdef: true });
});

test("rejects malformed keys and outcomes", async () => {
  for (const bad of [null, "", "A".repeat(64), "a".repeat(63), "someone@example.com"]) {
    await assert.rejects(() => admit(bad), /invalid_account_key/);
    await assert.rejects(() => record(bad, "rejected"), /invalid_signin_throttle_input/);
  }
  for (const bad of [null, "", "failed", "VERIFIED"]) await assert.rejects(() => record(key("a"), bad), /invalid_signin_throttle_input/);
});

test("a burst of parallel attempts gets at most eight password checks (Strix review on PR #280)", async () => {
  const k = key("b");
  // Twenty requests arrive before any provider answer comes back: no record() calls in between.
  const results = [];
  for (let i = 0; i < 20; i++) results.push(await admit(k));
  assert.equal(results.filter((s) => s === 0).length, 8, "exactly eight admitted");
  assert.ok(results.slice(8).every(near15min), "the ninth and later are refused with the lock");
  // The eight in-flight checks then fail; the lock is neither lifted nor extended.
  const { locked_until: before } = await row(k);
  for (let i = 0; i < 8; i++) assert.ok(near15min(await record(k, "rejected")));
  assert.deepEqual((await row(k)).locked_until, before);
  assert.ok(near15min(await admit(k)));
});

test("sequential wrong passwords: the eighth failure locks immediately", async () => {
  const k = key("c");
  for (let i = 1; i <= 7; i++) { assert.equal(await admit(k), 0); assert.equal(await record(k, "rejected"), 0, `failure ${i}`); }
  assert.equal(await admit(k), 0);
  assert.ok(near15min(await record(k, "rejected")), "eighth failure reports the lock");
  assert.ok(near15min(await admit(k)));
  assert.equal(await admit(key("d")), 0, "other emails are unaffected");
  await record(key("d"), "verified");
});

test("unknown outcomes give the slot back; verified clears everything", async () => {
  const k = key("e");
  for (let i = 0; i < 7; i++) { await admit(k); await record(k, "rejected"); }
  for (let i = 0; i < 5; i++) { assert.equal(await admit(k), 0); assert.equal(await record(k, "unknown"), 0); }
  assert.equal((await row(k)).failures, 7, "outages do not count as guesses");
  assert.equal(await admit(k), 0);
  assert.equal(await record(k, "verified"), 0);
  assert.equal(await row(k), undefined, "a correct password removes the key");
  // A completed reset clears an active lock without a prior admission.
  for (let i = 0; i < 9; i++) await admit(k);
  assert.ok(near15min(await admit(k)));
  assert.equal(await record(k, "verified"), 0);
  assert.equal(await admit(k), 0);
  await record(k, "verified");
});

test("window and lock expiry start a fresh budget", async () => {
  const k = key("f");
  for (let i = 0; i < 7; i++) { await admit(k); await record(k, "rejected"); }
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '16 minutes' where account_key=$1", [k]);
  assert.equal(await admit(k), 0);
  assert.equal((await row(k)).failures, 1, "old failures no longer count");
  await db.query("update public.auth_signin_throttle set failures = 8, locked_until = now() - interval '1 second' where account_key=$1", [k]);
  assert.equal(await admit(k), 0, "expired lock admits again");
  assert.equal((await row(k)).failures, 1);
  assert.equal(await record(k, "rejected"), 0);
});

test("stale unlocked keys are pruned", async () => {
  const stale = key("0");
  await admit(stale); await record(stale, "rejected");
  await db.query("update public.auth_signin_throttle set last_failure_at = now() - interval '2 days' where account_key=$1", [stale]);
  await admit(key("1")); await record(key("1"), "rejected");
  assert.equal(await row(stale), undefined);
});

test.after(async () => db.close());
