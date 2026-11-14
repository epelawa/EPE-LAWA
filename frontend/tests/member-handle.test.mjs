import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { availabilityFromRpc, isValidHandle, normalizeHandle } from "../apps/main/lib/member-handle.ts";
const root = new URL("../apps/main/app/", import.meta.url);
test("handle normalization, syntax and reserved names are enforced", () => {
  assert.equal(normalizeHandle("  Epe_Fan  "), "epe_fan");
  assert.equal(isValidHandle("epe_fan"), true);
  assert.equal(isValidHandle("ab"), false);
  assert.equal(isValidHandle("bad-handle"), false);
  assert.equal(isValidHandle("admin"), false);
  assert.equal(isValidHandle("support"), false);
});
test("availability exposes only available, taken or unavailable", () => {
  assert.equal(availabilityFromRpc("available"), "available");
  assert.equal(availabilityFromRpc("taken"), "taken");
  for (const value of [null, false, "user-id", "email@example.com", "error"]) assert.equal(availabilityFromRpc(value), "unavailable");
});
test("server checks at Continue and rechecks before signup; schema failures fail closed", async () => {
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const forms = await readFile(new URL("auth/auth-forms.tsx", root), "utf8");
  assert.match(actions, /member_handle_availability/);
  assert.match(actions, /availability !== "available"/);
  assert.match(actions, /isValidHandle\(handle\)/);
  assert.match(forms, /verifyHandleBeforeContinue\(input\.value\)/);
  assert.match(forms, /result === "taken"/);
  assert.match(forms, /result === "taken" \?/);
});
test("profile completion requires verified email and uses scoped bootstrap RPC only", async () => {
  const complete = await readFile(new URL("auth/complete/page.tsx", root), "utf8");
  assert.match(complete, /if \(!user\.email_confirmed_at\)/);
  assert.match(complete, /rpc\("bootstrap_verified_member_profile"\)/);
  assert.doesNotMatch(complete, /from\("profiles"\)\.insert/);
  assert.match(complete, /created !== true/);
  assert.match(complete, /setup is incomplete/);
});
test("bootstrap handles duplicate races with unique constraint and audits only insert", async () => {
  const migration = await readFile(new URL("../../backend/supabase/migrations/20261114190000_member_handle_and_verified_bootstrap.sql", import.meta.url), "utf8");
  assert.match(migration, /on conflict \(user_id\) do nothing/);
  assert.match(migration, /exception when unique_violation/);
  assert.match(migration, /if v_inserted = 1 then[\s\S]*?audit_event/);
  assert.match(migration, /jsonb_build_object\('source', 'verified_auth_bootstrap'\)/);
  assert.doesNotMatch(migration, /jsonb_build_object\([^)]*(?:email|handle|display_name)/i);
});
test("recovery preserves exact anti-enumeration title, body and progress label", async () => {
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const forms = await readFile(new URL("auth/auth-forms.tsx", root), "utf8");
  assert.match(forms, /title="Check your inbox"/);
  assert.match(forms, /progress="Step 2 of 2 · Recovery request"/);
  assert.match(actions, /If an account exists for that address, password-reset instructions may be sent\. Delivery depends on this project’s configured email provider\./);
});
