import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { combineCapabilityStates, resolveDashboardMetric } from "../apps/admin/lib/dashboard-data.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("a server-verified zero remains a real zero", () => {
  assert.deepEqual(resolveDashboardMetric({ count: 0, error: null }, true), { value: 0, status: "verified" });
});

test("denied capability never exposes a returned count", () => {
  assert.deepEqual(resolveDashboardMetric({ count: 4, error: null }, false), { value: null, status: "restricted" });
});

test("missing, failed, malformed, or unverified counts remain unavailable", () => {
  for (const [result, allowed] of [
    [null, true],
    [{ count: null, error: null }, true],
    [{ count: 4, error: { code: "RLS_DENIED" } }, true],
    [{ count: 1.5, error: null }, true],
    [{ count: -1, error: null }, true],
    [{ count: 0, error: null }, null],
  ]) {
    assert.deepEqual(resolveDashboardMetric(result, allowed), { value: null, status: "unavailable" });
  }
});

test("combined capability checks fail closed but accept any explicitly granted capability", () => {
  assert.equal(combineCapabilityStates(true, null), true);
  assert.equal(combineCapabilityStates(false, false), false);
  assert.equal(combineCapabilityStates(false, null), null);
  assert.equal(combineCapabilityStates(), null);
});

test("dashboard reads are request-scoped, count-only, and have no write path", () => {
  const page = read("frontend/apps/admin/app/(protected)/page.tsx");
  assert.match(page, /export default async function DashboardPage/);
  assert.match(page, /await createClient\(\)/);
  assert.match(page, /countForCapability\(articleRead/);
  assert.match(page, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(page, /hasCapability\(supabase, name\)/);
  assert.match(page, /capabilities\["article.create"\] === true/);
  assert.doesNotMatch(page, /order\.manage|"orders"/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(|service_role|serviceRole/i);
  assert.doesNotMatch(page, /select\(["'](?:email|phone|delivery_address|payment_method|report_body)/i);
  assert.match(read("frontend/apps/main/app/admin/(protected)/page.tsx"), /export \{ default \} from/);
  assert.match(read("frontend/apps/admin/app/(protected)/layout.tsx"), /AdminAccessGuard/);
  assert.match(read("frontend/apps/main/app/admin/(protected)/layout.tsx"), /AdminAccessGuard loginPath="\/admin\/login"/);
});

test("dashboard keeps responsive reflow, visible global focus, and reduced-motion support", () => {
  const styles = read("frontend/apps/admin/app/admin-dashboard.module.css");
  assert.match(styles, /@media \(max-width: 1080px\)/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(read("frontend/apps/admin/app/globals.css"), /:focus-visible/);
});
