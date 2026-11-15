import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../apps/main/app/globals.css", import.meta.url), "utf8");

test("linework is a subtle static light-only public canvas treatment", () => {
  const selector = /html\[data-theme="light"\] body:not\(:has\(\.auth-page\)\):not\(:has\(\.focused-error-shell\)\):not\(:has\(\.site-head--news-reference\)\)/;
  const light = css.match(/html\[data-theme="light"\] body:not\(:has\(\.auth-page\)\):not\(:has\(\.focused-error-shell\)\):not\(:has\(\.site-head--news-reference\)\)\s*\{([^}]*)\}/)?.[1];
  assert.ok(light, "public light pages receive a canvas-only pattern");
  assert.match(light, /background-image:\s*[\s\S]*linear-gradient/);
  assert.match(light, /rgb\(71 127 224 \/ 0\.025\)/);
  assert.match(light, /rgb\(41 75 145 \/ 0\.018\)/);
  assert.match(light, /background-attachment:\s*fixed/);
  assert.doesNotMatch(light, /position:|z-index:|pointer-events:|animation|transition/);
  assert.match(css, /html\[data-theme="dark"\]\s+body\s*\{\s*background-image:\s*none;\s*\}/);
  assert.match(css, /html\[data-theme="light"\]\s+body:has\(\.site-head--news-reference\),html\[data-theme="dark"\]\s+body:has\(\.site-head--news-reference\)\s*\{\s*background-color:#fff; background-image:none;\s*\}/);
  assert.match(css, selector);
});

test("dark theme semantic surfaces and palette tokens remain exactly as on main", async () => {
  const { execFileSync } = await import("node:child_process");
  const baseline = execFileSync("git", ["show", "5ce245beeb23c8ea972c7ea9700ad747321fa2e5:frontend/apps/main/app/globals.css"], { encoding: "utf8" });
  const darkBlock = (source) => source.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/)?.[1];
  assert.ok(darkBlock(baseline));
  assert.equal(darkBlock(css), darkBlock(baseline));
  assert.match(css, /html\[data-theme="dark"\]\s+body\s*\{\s*background-image:\s*none;\s*\}/);
});
