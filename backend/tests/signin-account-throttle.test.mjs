import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin;");
for (const migration of [
  "20261129000000_signin_account_throttle.sql",
  "20261129010000_signin_throttle_atomic_admission.sql",
  "20261129020000_signin_throttle_reservations.sql",
]) {
  await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
}

const key = (c) => c.repeat(64);
const admit = async (k) => (await db.query("select public.signin_throttle_admit($1) s", [k])).rows[0].s;
const record = async (k, outcome, reservation = null) =>
  (await db.query("select public.signin_throttle_record($1,$2,$3::uuid) s", [k, outcome, reservation])).rows[0].s;
const row = async (k) => (await db.query("select failures, pending, locked_until, generation from public.auth_signin_throttle where account_key=$1", [k])).rows[0];
const near15min = (s) => s > 890 && s <= 900;
const token = (a) => { assert.equal(a.admitted, true, JSON.stringify(a)); return a.reservation; };
const reject = async (k) => record(k, "rejected", token(await admit(k)));

test("only service_role can use the throttle; earlier function versions are gone", async () => {
  const { rows: [r] } = await db.query(`select
    has_function_privilege('anon','public.signin_throttle_admit(text)','execute') anon_admit,
    has_function_privilege('authenticated','public.signin_throttle_record(text,text,uuid)','execute') auth_record,
    has_table_privilege('anon','public.auth_signin_throttle','select') anon_read,
    has_function_privilege('service_role','public.signin_throttle_admit(text)','execute') svc_admit,
    has_function_privilege('service_role','public.signin_throttle_record(text,text,uuid)','execute') svc_record,
    to_regprocedure('public.signin_throttle_status(text)') is null status_dropped,
    to_regprocedure('public.signin_throttle_record(text,boolean)') is null v1_record_dropped,
    to_regprocedure('public.signin_throttle_record(text,text)') is null v2_record_dropped,
    (select bool_and(prosecdef) from pg_proc where proname in ('signin_throttle_admit','signin_throttle_record')) secdef`);
  assert.deepEqual(r, { anon_admit: false, auth_record: false, anon_read: false, svc_admit: true, svc_record: true, status_dropped: true, v1_record_dropped: true, v2_record_dropped: true, secdef: true });
});

test("rejects malformed keys, outcomes and missing reservations", async () => {
  for (const bad of [null, "", "A".repeat(64), "a".repeat(63), "someone@example.com"]) {
    await assert.rejects(() => admit(bad), /invalid_account_key/);
    await assert.rejects(() => record(bad, "verified"), /invalid_signin_throttle_input/);
  }
  for (const bad of [null, "", "failed", "VERIFIED"]) await assert.rejects(() => record(key("a"), bad), /invalid_signin_throttle_input/);
  await assert.rejects(() => record(key("a"), "rejected"), /invalid_signin_throttle_input/, "rejected needs its reservation");
  await assert.rejects(() => record(key("a"), "unknown"), /invalid_signin_throttle_input/, "unknown needs its reservation");
});

test("a parallel burst gets at most eight checks and pending checks never start a lock (Strix + CodeRabbit on PR #280)", async () => {
  const k = key("b");
  // Twenty requests arrive before any provider answer comes back.
  const results = [];
  for (let i = 0; i < 20; i++) results.push(await admit(k));
  const admitted = results.filter((r) => r.admitted === true);
  assert.equal(admitted.length, 8, "exactly eight admitted");
  assert.ok(results.slice(8).every((r) => r.busy === 30 && !("locked" in r)), "the rest are refused as busy, without a lock");
  assert.equal((await row(k)).locked_until, null);
  // Seven turn out wrong: still no lock, and the slots stay spent.
  for (const a of admitted.slice(0, 7)) assert.equal(await record(k, "rejected", a.reservation), 0);
  assert.equal((await admit(k)).busy, 30, "seven failed plus one in flight fill the window");
  // The eighth confirmed wrong password locks.
  assert.ok(near15min(await record(k, "rejected", admitted[7].reservation)));
  assert.ok(near15min((await admit(k)).locked));
});

test("outages never lock: unknown outcomes release their slots", async () => {
  const k = key("c");
  const burst = [];
  for (let i = 0; i < 9; i++) burst.push(await admit(k));
  for (const a of burst.slice(0, 8)) assert.equal(await record(k, "unknown", a.reservation), 0);
  assert.deepEqual({ failures: (await row(k)).failures, pending: (await row(k)).pending, locked: (await row(k)).locked_until }, { failures: 0, pending: 0, locked: null });
  for (let i = 1; i <= 7; i++) assert.equal(await reject(k), 0, `failure ${i}`);
  assert.ok(near15min(await reject(k)), "the eighth confirmed failure locks");
  assert.equal(token(await admit(key("d"))).length, 36, "other emails are unaffected");
  await record(key("d"), "verified");
});

test("a stale outcome cannot change a newer generation (CodeRabbit on PR #280)", async () => {
  const k = key("e");
  const a = token(await admit(k));
  const b = token(await admit(k));
  assert.equal(await record(k, "verified", b), 0, "B signs in: the key is cleared");
  const c = token(await admit(k));
  assert.notEqual(c, a, "a new row generation");
  assert.equal(await record(k, "unknown", a), 0, "A's late outcome is ignored");
  assert.equal(await record(k, "rejected", a), 0);
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [0, 1], "C's reservation is intact");
  await record(k, "rejected", c);
  assert.equal((await row(k)).failures, 1, "C's failure counts");
  await record(k, "verified");
});

test("verified clears a lock without a reservation (reset or emailed code)", async () => {
  const k = key("f");
  for (let i = 0; i < 8; i++) await reject(k);
  assert.ok(near15min((await admit(k)).locked));
  assert.equal(await record(k, "verified"), 0);
  assert.equal(await row(k), undefined);
  token(await admit(k));
  await record(k, "verified");
});

test("window and lock expiry start a fresh budget and a new generation", async () => {
  const k = key("1");
  for (let i = 0; i < 7; i++) await reject(k);
  const old = token(await admit(k));
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '16 minutes' where account_key=$1", [k]);
  const fresh = token(await admit(k));
  assert.notEqual(fresh, old);
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [0, 1], "old failures and reservations no longer count");
  assert.equal(await record(k, "rejected", old), 0, "an outcome from the old window is ignored");
  assert.equal((await row(k)).failures, 0);
  await db.query("update public.auth_signin_throttle set failures = 8, locked_until = now() - interval '1 second' where account_key=$1", [k]);
  token(await admit(k));
  assert.equal((await row(k)).failures, 0, "expired lock admits again with a fresh count");
  await record(k, "verified");
});

test("new account keys are capped per hour; known keys keep working (Strix on PR #280)", async () => {
  const known = key("7");
  await reject(known);
  await db.query("delete from public.auth_signin_throttle where account_key <> $1", [known]);
  // 999 other fresh keys this hour, plus the known one, reach the 1000 cap.
  await db.query(`insert into public.auth_signin_throttle (account_key, failures, window_started_at, last_failure_at, created_at)
    select encode(sha256(convert_to('flood' || g::text, 'UTF8')), 'hex'), 1, now(), now(), now() from generate_series(1, 999) g`);
  assert.deepEqual(await admit(key("8")), { capacity: true }, "a fresh key beyond the cap is refused, not stored");
  assert.equal(await row(key("8")), undefined);
  const r = token(await admit(known));
  assert.equal((await row(known)).failures, 1, "an existing key keeps its count");
  await record(known, "unknown", r);
  // Keys older than an hour no longer count; day-old idle keys are pruned when a new key is created.
  await db.query("update public.auth_signin_throttle set created_at = now() - interval '2 hours', last_failure_at = now() - interval '2 days' where account_key <> $1", [known]);
  token(await admit(key("8")));
  assert.equal((await db.query("select count(*)::int n from public.auth_signin_throttle")).rows[0].n, 2, "only the known and the new key remain");
  await record(key("8"), "verified"); await record(known, "verified");
});

test.after(async () => db.close());
