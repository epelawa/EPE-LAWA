import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { authRateLimitPolicies, buildAuthRateLimitRpcArgs, getTrustedClientIp } from "../apps/main/lib/auth-rate-limit.ts";

const migrationPath = new URL("../../backend/supabase/migrations/20261114160000_auth_rate_limiting.sql", import.meta.url);

function headers(values) {
  return new Headers(values);
}

test("trusted client IP uses only Vercel's validated x-real-ip and rejects malformed values", () => {
  assert.equal(getTrustedClientIp(headers({ "x-real-ip": "203.0.113.18", "x-forwarded-for": "198.51.100.9" })), "203.0.113.18");
  assert.equal(getTrustedClientIp(headers({ "x-real-ip": "2001:db8::7" })), "2001:db8::7");
  assert.equal(getTrustedClientIp(headers({ "x-forwarded-for": "198.51.100.9" })), null);
  assert.equal(getTrustedClientIp(headers({ "x-real-ip": "198.51.100.9, 203.0.113.18", "x-forwarded-for": "198.51.100.9" })), null);
  assert.equal(getTrustedClientIp(headers({ "x-real-ip": "x".repeat(65) })), null);
});

test("rate-limit RPC receives opaque email/IP HMACs and distinct email/IP quotas", () => {
  const secret = "synthetic-service-role-key-for-test-only";
  const args = buildAuthRateLimitRpcArgs("signup", " MEMBER@Example.com ", "203.0.113.18", secret);
  assert.match(args.p_email_hash, /^[a-f0-9]{64}$/);
  assert.match(args.p_ip_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(args.p_email_hash, args.p_ip_hash);
  assert.doesNotMatch(JSON.stringify(args), /member@example\.com|203\.0\.113\.18|synthetic-service-role-key/i);
  assert.equal(args.p_email_limit, 5);
  assert.equal(args.p_ip_limit, 20);
  assert.equal(buildAuthRateLimitRpcArgs("signup", "member@example.com", null, secret).p_ip_hash, null);
  assert.deepEqual(Object.keys(authRateLimitPolicies).sort(), ["otp_resend", "otp_verify", "recovery", "signin", "signup"]);
  assert.ok(authRateLimitPolicies.signin.ip.max > authRateLimitPolicies.signin.email.max);
});

test("all required auth operations call the persistent limiter and passwords are not normalized", async () => {
  const actions = await readFile(new URL("../apps/main/app/auth/actions.ts", import.meta.url), "utf8");
  for (const flow of ["signup", "signin", "otp_verify", "otp_resend", "recovery"]) {
    assert.match(actions, new RegExp(`consumeAuthRateLimit\\(\\"${flow}\\"`), `${flow} must use the persistent limiter`);
  }
  assert.match(actions, /const password = rawField\(data, "password"\)/);
  assert.doesNotMatch(actions, /field\(data, "password"\)/);
  assert.match(actions, /consumeAuthRateLimit\("recovery", user\.email\)/);
});

test("limiter migration is service-role-only and uses atomic upserts with bounded cleanup", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.auth_rate_limit_buckets from public, anon, authenticated/i);
  assert.match(sql, /on conflict \(flow, subject_hash\) do update/i);
  assert.match(sql, /limit 100\s+for update skip locked/i);
  assert.match(sql, /interval '2 days'/i);
  assert.match(sql, /grant execute on function public\.consume_auth_rate_limit\([^;]+ to service_role/i);
  assert.match(sql, /revoke all on function public\.consume_auth_rate_limit\([^;]+ from public, anon, authenticated/i);
});

test("PGlite enforces separate email/IP limits and prunes stale rows in a bounded pass", async () => {
  const db = new PGlite();
  try {
    const migration = await readFile(migrationPath, "utf8");
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(migration);

    const call = async (emailHash, ipHash, emailLimit = 2, ipLimit = 5) => {
      const result = await db.query(
        "select public.consume_auth_rate_limit($1, $2, 'signin', $3, 900, $4, 900) as allowed",
        [emailHash, ipHash, emailLimit, ipLimit],
      );
      return result.rows[0].allowed;
    };
    const emailA = "a".repeat(64);
    const emailB = "b".repeat(64);
    const emailC = "c".repeat(64);
    const ip = "d".repeat(64);

    assert.equal(await call(emailA, ip), true);
    assert.equal(await call(emailA, ip), true);
    assert.equal(await call(emailA, ip), false, "email limit blocks the third attempt");
    assert.equal(await call(emailB, ip), true, "another email can still use the independent IP quota");
    assert.equal(await call(emailC, ip), true);
    assert.equal(await call("e".repeat(64), ip), false, "IP limit blocks before a new email bucket is created");
    const rows = await db.query("select flow, subject_hash from public.auth_rate_limit_buckets order by subject_hash");
    assert.equal(rows.rows.length, 4, "IP and three admitted email buckets only");

    await db.exec(`
      insert into public.auth_rate_limit_buckets(flow, subject_hash, window_started_at, attempts)
      select 'recovery', lpad(to_hex(n), 64, '0'), clock_timestamp() - interval '3 days', 1
      from generate_series(1, 105) as n;
    `);
    await call("f".repeat(64), ip, 2, 10);
    const stale = await db.query("select count(*)::int as count from public.auth_rate_limit_buckets where window_started_at < clock_timestamp() - interval '2 days'");
    assert.equal(stale.rows[0].count, 5, "one call removes at most 100 stale rows");

    const privileges = await db.query(`
      select
        has_function_privilege('service_role', 'public.consume_auth_rate_limit(text,text,text,integer,integer,integer,integer)', 'EXECUTE') as service_can_execute,
        has_function_privilege('authenticated', 'public.consume_auth_rate_limit(text,text,text,integer,integer,integer,integer)', 'EXECUTE') as member_can_execute,
        has_table_privilege('anon', 'public.auth_rate_limit_buckets', 'SELECT') as anon_can_read
    `);
    assert.equal(privileges.rows[0].service_can_execute, true);
    assert.equal(privileges.rows[0].member_can_execute, false);
    assert.equal(privileges.rows[0].anon_can_read, false);
  } finally {
    await db.close();
  }
});
