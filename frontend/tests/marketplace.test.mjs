import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../../backend/supabase/migrations/20261107220500_marketplace_requests_moderation.sql", import.meta.url), "utf8");
const action = await readFile(new URL("../apps/main/app/business-directory/order-actions.ts", import.meta.url), "utf8");
const form = await readFile(new URL("../apps/main/app/business-directory/order-request-form.tsx", import.meta.url), "utf8");
const detail = await readFile(new URL("../apps/main/app/business-directory/[slug]/page.tsx", import.meta.url), "utf8");
const admin = await readFile(new URL("../apps/admin/app/(protected)/orders/actions.ts", import.meta.url), "utf8");

test("order request uses a database RPC that recomputes price and refuses fake/paid orders", () => {
  assert.match(action, /rpc\("marketplace_order_request"/);
  assert.doesNotMatch(action, /service_role|SUPABASE_SERVICE|total_kobo/);
  assert.match(migration, /p\.price_kobo\*p_quantity/);
  assert.match(migration, /p\.stock<p_quantity/);
  assert.match(migration, /b\.status='published'/);
  assert.match(migration, /order_status_history\([^;]+values\(oid,null,'pending'/s);
  assert.doesNotMatch(migration, /set status='paid'|p_status.*paid/);
});

test("delivery details are only requested for fulfillment and payment/card entry is absent", () => {
  assert.match(form, /value="delivery"/);
  assert.match(form, /payment (is )?unavailable/i);
  assert.match(form, /no card details are collected/i);
  assert.doesNotMatch(form, /card(number|_number)|cvv|cvc/i);
  assert.match(migration, /delivery_address/);
});

test("review visibility is gated on moderation with reason and audit trail", () => {
  assert.match(migration, /state='pending'/);
  assert.match(migration, /business_review_moderation_history/);
  assert.match(migration, /p_reason/);
  assert.match(detail, /eq\("state", "visible"\)/);
});

test("order management uses capability and audited RPC; sponsored label queries date-bounded active view", () => {
  assert.match(admin, /order\.manage/);
  assert.match(admin, /rpc\("order_advance"/);
  assert.doesNotMatch(admin, /paid|refunded/);
  assert.match(detail, /active_business_sponsorships/);
  assert.match(detail, /Sponsored/);
});
