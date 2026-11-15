import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../apps/admin/", import.meta.url);
const page = await readFile(new URL("app/(protected)/page.tsx", app), "utf8");
const styles = await readFile(new URL("app/globals.css", app), "utf8");

test("Admin dashboard counts are real, capability-gated database queues", () => {
  assert.match(page, /hasCapability\(supabase, "article\.publish"\)/);
  assert.match(page, /hasCapability\(supabase, "moderation\.review"\)/);
  assert.match(page, /hasCapability\(supabase, "order\.manage"\)/);
  assert.match(page, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(page, /\.eq\("state", "open"\)/);
  assert.match(page, /\.in\("status", \["pending", "paid", "preparing", "out_for_delivery"\]\)/);
  assert.match(page, /hasAccess === false/);
  assert.match(page, /hasAccess === null \|\| result\.error/);
  assert.match(page, /return metric\(result\.count \?\? 0\)/);
  assert.match(page, /Unavailable/);
  assert.doesNotMatch(page, /service_role|mock|sample|fake|chart|subscriber|views|recent activity|latest article/i);
});

test("dashboard labels, actions and accessibility reflect real staff workflows", () => {
  for (const label of [
    "Articles without a public version",
    "Private article versions",
    "Open moderation reports",
    "Orders needing attention",
  ]) assert.ok(page.includes(label), `missing verified queue: ${label}`);
  for (const route of ["/newsroom", "/moderation/forum", "/orders", "/newsroom/new"]) {
    assert.ok(page.includes(route), `missing real staff route: ${route}`);
  }
  assert.match(page, /aria-labelledby="dashboard-queues-heading"/);
  assert.match(page, /aria-labelledby="dashboard-editorial-heading"/);
  assert.match(page, /Unavailab[l]?e means the count could not be verified; it is never a zero/);
  assert.match(page, /Personal member details, delivery addresses, payment data and private reports are not shown/);
});

test("Admin dashboard uses responsive reference-inspired green cards without mock charts", () => {
  assert.match(page, /className="admin-dashboard__hero"/);
  assert.match(page, /className="admin-dashboard__grid"/);
  assert.match(page, /className="admin-dashboard__editorial"/);
  assert.match(styles, /\.admin-dashboard__grid\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:1080px\)\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:520px\)[\s\S]*?\.admin-dashboard__grid\s*\{[^}]*grid-template-columns:1fr/);
  assert.match(styles, /--dashboard-forest:#063d2b/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(styles, /dashboard-chart|dashboard-activity|sample-article|fake-metric/i);
});
