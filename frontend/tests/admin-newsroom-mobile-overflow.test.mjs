import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const [page, styles] = await Promise.all([
  readFile(new URL("frontend/apps/admin/app/(protected)/newsroom/page.tsx", root), "utf8"),
  readFile(new URL("frontend/apps/admin/app/globals.css", root), "utf8"),
]);

test("Admin newsroom table is a keyboard-accessible, bounded horizontal scroller", () => {
  assert.match(page, /className=\{`ui-table admin-newsroom-table \$\{styles\.table\}`\}[^>]*role="region"[^>]*aria-label="Articles list; scroll horizontally to see all columns"[^>]*tabIndex=\{0\}/);
  assert.match(page, /className=\{styles\.cards\}/);
  assert.match(page, /Edit article/);
  assert.match(styles, /\.admin-newsroom-list\s*\{\s*min-width:0;/);
  assert.match(styles, /\.admin-newsroom-table\s*\{[^}]*width:100%;[^}]*min-width:0;[^}]*overflow-x:auto;/);
  assert.match(styles, /\.admin-newsroom-table table\s*\{\s*min-width:680px;/);
  assert.match(styles, /\.admin-newsroom-table \.ui-item-title,\.admin-newsroom-table \.ui-meta\s*\{\s*overflow-wrap:anywhere;/);
  assert.match(styles, /\.admin-newsroom-table\s*\{\s*position:relative;/);
  assert.match(styles, /\.admin-newsroom-table td:last-child\s*\{\s*white-space:nowrap;/);
});
