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
  "20261129030000_signin_throttle_window_check.sql",
  "20261129040000_signin_throttle_rollover.sql",
  "20261129050000_signin_throttle_slots.sql",
  "20261129060000_signin_lock_exit_lane.sql",
  "20261129070000_human_check_single_use.sql",
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
/** Makes one reservation look as if it was admitted `ago` (a Postgres interval) and its request then died. */
const age = (k, slot, ago) => db.query(
  "update public.auth_signin_throttle set held = jsonb_set(held, array[$2], to_jsonb(extract(epoch from now() - $3::interval))) where account_key=$1",
  [k, slot, ago]);
const exit = async (k, kind) => (await db.query("select public.signin_throttle_exit_allowance($1,$2) s", [k, kind])).rows[0].s;
const spend = async (hash, expires) => (await db.query("select public.human_check_spend($1,$2::timestamptz) s", [hash, expires])).rows[0].s;

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

test("a late rejection counts in the window it lands in, never the expired one (CodeRabbit on PR #280)", async () => {
  const k = key("2");
  for (let i = 0; i < 7; i++) await reject(k);
  const late = token(await admit(k));
  // The 15-minute window closes while this check is still in flight.
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '15 minutes 1 second' where account_key=$1", [k]);
  assert.equal(await record(k, "rejected", late), 0, "no lock from failures spanning two windows");
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [1, 0], "it opens the new window with one failure");
  await record(k, "verified");
  // Eight confirmations inside one window still lock.
  for (let i = 0; i < 7; i++) await reject(k);
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '14 minutes' where account_key=$1", [k]);
  assert.ok(near15min(await reject(k)));
  await record(k, "verified");
});

test("a batch timed across the window boundary is still counted and locks (Strix on PR #280)", async () => {
  const k = key("3");
  const batch = [];
  for (let i = 0; i < 8; i++) batch.push(token(await admit(k)));
  // The window closes just before the provider answers.
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '15 minutes 1 second' where account_key=$1", [k]);
  const results = [];
  for (const r of batch) results.push(await record(k, "rejected", r));
  assert.deepEqual(results.slice(0, 7), [0, 0, 0, 0, 0, 0, 0]);
  assert.ok(near15min(results[7]), "all eight count in the new window and the eighth locks");
  assert.ok(near15min((await admit(k)).locked));
  await record(k, "verified");
});

test("a plain rollover keeps in-flight checks; idle slots are released; lock expiry starts clean", async () => {
  const k = key("1");
  for (let i = 0; i < 7; i++) await reject(k);
  const inFlight = token(await admit(k));
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '16 minutes' where account_key=$1", [k]);
  const next = token(await admit(k));
  assert.notEqual(next, inFlight, "every reservation is its own slot");
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [0, 2], "old failures reset; the in-flight check still holds its slot");
  await record(k, "rejected", inFlight);
  assert.equal((await row(k)).failures, 1, "the in-flight check's failure counts in the new window");
  await record(k, "unknown", next);
  // Reservations idle for 2 minutes belonged to dead requests.
  const dead = [];
  for (let i = 0; i < 5; i++) dead.push(token(await admit(k)));
  for (const d of dead) await age(k, d, "3 minutes");
  token(await admit(k));
  assert.equal((await row(k)).pending, 1, "dead reservations released");
  await record(k, "verified");
  for (let i = 0; i < 8; i++) await reject(k);
  const stale = token(await (async () => {
    await db.query("update public.auth_signin_throttle set locked_until = now() - interval '1 second' where account_key=$1", [k]);
    return admit(k);
  })());
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [0, 1], "a lock expiry starts a clean window");
  await record(k, "unknown", stale);
  await record(k, "verified");
});

test("a late outcome from a released slot never frees a live one (CodeRabbit 4719201552 on PR #280)", async () => {
  const k = key("4");
  const first = [];
  for (let i = 0; i < 8; i++) first.push(token(await admit(k)));
  // The first check's request dies (no outcome for 2 minutes): its slot is released and reused.
  await age(k, first[0], "3 minutes");
  const replacement = token(await admit(k));
  assert.equal((await row(k)).pending, 8, "eight live checks: seven old plus the replacement");
  // Now the dead request's outcome arrives after all.
  assert.equal(await record(k, "unknown", first[0]), 0);
  assert.equal((await row(k)).pending, 8, "it frees nothing: the replacement still holds its slot");
  assert.equal((await admit(k)).busy, 30, "so a ninth check is still refused");
  assert.equal(await record(k, "unknown", first[0]), 0, "a repeat is ignored too");
  // A late rejection from a released slot still counts as a failure (and only once).
  await age(k, first[1], "3 minutes");
  const second = token(await admit(k));
  await record(k, "rejected", first[1]);
  await record(k, "rejected", first[1]);
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [1, 8], "counted once, frees nothing");
  for (const t of [...first.slice(2), replacement, second]) await record(k, "unknown", t);
  assert.equal((await row(k)).pending, 0);
  await record(k, "verified");
});

test("recording after the window closes releases idle slots first (CodeRabbit 4719201562 on PR #280)", async () => {
  const k = key("5");
  const slots = [];
  for (let i = 0; i < 8; i++) slots.push(token(await admit(k)));
  // Seven requests die; the eighth answers late, after the 15-minute window.
  for (const t of slots.slice(0, 7)) await age(k, t, "3 minutes");
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '15 minutes 1 second' where account_key=$1", [k]);
  assert.equal(await record(k, "rejected", slots[7]), 0);
  assert.deepEqual([(await row(k)).failures, (await row(k)).pending], [1, 0], "the new window holds one failure and no dead slots");
  const fresh = await admit(k);
  assert.equal(fresh.admitted, true, "the owner is not told the address is busy");
  await record(k, "unknown", fresh.reservation);
  await record(k, "verified");
});

test("a locked address keeps a small reserved lane for reset and emailed codes (Strix 4719159441 on PR #280)", async () => {
  const k = key("6");
  await assert.rejects(() => exit(k, "login"), /invalid_signin_exit_input/);
  await assert.rejects(() => exit("x", "reset"), /invalid_signin_exit_input/);
  assert.equal(await exit(k, "reset"), false, "no row: the normal shared budget applies");
  await reject(k);
  assert.equal(await exit(k, "reset"), false, "not locked: no reserved lane");
  for (let i = 0; i < 7; i++) await reject(k);
  assert.ok(near15min((await admit(k)).locked));
  assert.deepEqual([await exit(k, "reset"), await exit(k, "reset"), await exit(k, "reset"), await exit(k, "reset")], [true, true, true, false], "3 resets an hour");
  const codes = [];
  for (let i = 0; i < 11; i++) codes.push(await exit(k, "code"));
  assert.deepEqual(codes, [...Array(10).fill(true), false], "10 code checks an hour, counted separately");
  await db.query("update public.auth_signin_throttle set exit_bucket = exit_bucket - interval '1 hour' where account_key=$1", [k]);
  assert.equal(await exit(k, "reset"), true, "the allowance renews each hour");
  assert.equal(await exit(key("7"), "code"), false, "other addresses are unaffected");
  await record(k, "verified");
  assert.equal(await exit(k, "reset"), false, "once cleared, the lane closes");
  const { rows: [r] } = await db.query(`select
    has_function_privilege('anon','public.signin_throttle_exit_allowance(text,text)','execute') anon,
    has_function_privilege('authenticated','public.signin_throttle_exit_allowance(text,text)','execute') auth,
    has_function_privilege('service_role','public.signin_throttle_exit_allowance(text,text)','execute') svc,
    has_function_privilege('service_role','public.signin_throttle_release_idle(jsonb,jsonb,timestamptz)','execute') svc_internal`);
  assert.deepEqual(r, { anon: false, auth: false, svc: true, svc_internal: false });
});

test("sign-in challenge tokens are spent on first use (Strix 4718774891 on PR #280)", async () => {
  const hash = "c".repeat(64);
  const later = "now() + interval '2 hours'";
  const inTwoHours = (await db.query(`select (${later})::text t`)).rows[0].t;
  assert.equal(await spend(hash, inTwoHours), true, "first use passes");
  assert.equal(await spend(hash, inTwoHours), false, "a replay is refused");
  assert.equal(await spend("d".repeat(64), (await db.query("select (now() - interval '1 second')::text t")).rows[0].t), false, "already expired");
  assert.equal(await spend("e".repeat(64), (await db.query("select (now() + interval '4 hours')::text t")).rows[0].t), false, "expiry too far out");
  assert.equal(await spend("not-a-hash", inTwoHours), false);
  await db.query("update public.human_check_spent set expires_at = now() - interval '1 minute' where token_hash=$1", [hash]);
  assert.equal(await spend("f".repeat(64), inTwoHours), true);
  assert.equal((await db.query("select count(*)::int n from public.human_check_spent where token_hash=$1", [hash])).rows[0].n, 0, "expired rows are pruned");
  const { rows: [r] } = await db.query(`select
    has_function_privilege('anon','public.human_check_spend(text,timestamptz)','execute') anon,
    has_table_privilege('anon','public.human_check_spent','select') anon_read,
    has_function_privilege('service_role','public.human_check_spend(text,timestamptz)','execute') svc`);
  assert.deepEqual(r, { anon: false, anon_read: false, svc: true });
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
