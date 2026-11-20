import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const page = fs.readFileSync(
  `${root}apps/admin/app/(protected)/advertising/page.tsx`,
  "utf8",
);
const actions = fs.readFileSync(
  `${root}apps/admin/app/(protected)/advertising/actions.ts`,
  "utf8",
);
const migration = fs.readFileSync(
  `${root}../backend/supabase/migrations/20261120080000_advertising_admin_workflow.sql`,
  "utf8",
);
const navigation = fs.readFileSync(
  `${root}apps/admin/lib/navigation.ts`,
  "utf8",
);

test("admin advertising is capability-gated and fail-closed", () => {
  assert.match(page, /has_capability/);
  assert.match(page, /advertising\.manage/);
  assert.match(page, /No placement or payment\s+data is shown/);
  assert.doesNotMatch(page, /name="payment_id"|Payment UUID/);
});

test("admin advertising writes only through audited database RPCs", () => {
  assert.match(actions, /business_featured_save/);
  assert.doesNotMatch(actions, /payment_id/);
  assert.match(actions, /business_featured_end/);
  assert.doesNotMatch(
    actions,
    /\.from\("business_featured"\)\.(insert|update|delete)/,
  );
  assert.match(migration, /require_capability\('advertising\.manage'\)/g);
  assert.match(migration, /status = 'succeeded'/);
  assert.match(migration, /verified_at is not null/);
  assert.match(
    migration,
    /audit_event\('staff', 'advertising\.placement_create'/,
  );
  assert.match(migration, /audit_event\('staff', 'advertising\.placement_end'/);
});

test("advertising is discoverable in both staff navigation modes", () => {
  assert.match(navigation, /label: "Advertising"/);
  assert.match(navigation, /href: "\/advertising"/);
});
