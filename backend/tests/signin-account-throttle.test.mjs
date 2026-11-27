import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin;");
await db.exec(await readFile(new URL("../supabase/migrations/20261129000000_signin_account_throttle.sql", import.meta.url), "utf8"));

const KEY = "a".repeat(64);
const OTHER = "b".repeat(64);
const status = async (key) => (await db.query("select public.signin_throttle_status($1) s", [key])).rows[0].s;
const record = async (key, ok) => (await db.query("select public.signin_throttle_record($1,$2) s", [key, ok])).rows[0].s;

test("only service_role can read or change throttle state", async () => {
  const { rows: [r] } = await db.query(`select
    has_function_privilege('anon','public.signin_throttle_status(text)','execute') anon_status,
    has_function_privilege('authenticated','public.signin_throttle_record(text,boolean)','execute') auth_record,
    has_table_privilege('anon','public.auth_signin_throttle','select') anon_read,
    has_table_privilege('authenticated','public.auth_signin_throttle','update') auth_update,
    has_function_privilege('service_role','public.signin_throttle_status(text)','execute') svc_status,
    has_function_privilege('service_role','public.signin_throttle_record(text,boolean)','execute') svc_record,
    (select relrowsecurity from pg_class where oid = 'public.auth_signin_throttle'::regclass) rls`);
  assert.deepEqual(r, { anon_status: false, auth_record: false, anon_read: false, auth_update: false, svc_status: true, svc_record: true, rls: true });
});

test("rejects anything that is not a 64-hex account key", async () => {
  for (const bad of [null, "", "A".repeat(64), "a".repeat(63), "someone@example.com"]) {
    await assert.rejects(() => status(bad), /invalid_account_key/);
    await assert.rejects(() => record(bad, false), /invalid_signin_throttle_input/);
  }
  await assert.rejects(() => record(KEY, null), /invalid_signin_throttle_input/);
});

test("eight failures lock the key for fifteen minutes; other keys are unaffected", async () => {
  for (let i = 1; i <= 7; i++) assert.equal(await record(KEY, false), 0, `failure ${i} does not lock`);
  assert.equal(await status(KEY), 0);
  const locked = await record(KEY, false);
  assert.ok(locked > 890 && locked <= 900, `locked for ~15 minutes, got ${locked}`);
  const remaining = await status(KEY);
  assert.ok(remaining > 890 && remaining <= 900);
  assert.equal(await status(OTHER), 0);
  // A failure that slipped past the status check does not extend the lock.
  const { rows: [before] } = await db.query("select locked_until from public.auth_signin_throttle where account_key=$1", [KEY]);
  assert.ok((await record(KEY, false)) > 0);
  const { rows: [after] } = await db.query("select locked_until from public.auth_signin_throttle where account_key=$1", [KEY]);
  assert.deepEqual(after.locked_until, before.locked_until);
});

test("a successful sign-in (or completed reset) clears the key", async () => {
  assert.ok((await status(KEY)) > 0);
  assert.equal(await record(KEY, true), 0);
  assert.equal(await status(KEY), 0);
  assert.equal((await db.query("select count(*)::int n from public.auth_signin_throttle where account_key=$1", [KEY])).rows[0].n, 0);
});

test("the failure window restarts after fifteen minutes and an expired lock starts fresh", async () => {
  for (let i = 0; i < 7; i++) await record(OTHER, false);
  await db.query("update public.auth_signin_throttle set window_started_at = now() - interval '16 minutes' where account_key=$1", [OTHER]);
  assert.equal(await record(OTHER, false), 0, "old failures no longer count");
  assert.equal((await db.query("select failures from public.auth_signin_throttle where account_key=$1", [OTHER])).rows[0].failures, 1);

  await db.query("update public.auth_signin_throttle set failures = 8, locked_until = now() - interval '1 second' where account_key=$1", [OTHER]);
  assert.equal(await status(OTHER), 0, "expired lock allows sign-in");
  assert.equal(await record(OTHER, false), 0, "first failure after an expired lock does not re-lock");
  assert.equal((await db.query("select failures from public.auth_signin_throttle where account_key=$1", [OTHER])).rows[0].failures, 1);
});

test("stale unlocked keys are pruned when failures are recorded", async () => {
  const stale = "c".repeat(64);
  await record(stale, false);
  await db.query("update public.auth_signin_throttle set last_failure_at = now() - interval '2 days' where account_key=$1", [stale]);
  await record(OTHER, false);
  assert.equal((await db.query("select count(*)::int n from public.auth_signin_throttle where account_key=$1", [stale])).rows[0].n, 0);
});

test.after(async () => db.close());
