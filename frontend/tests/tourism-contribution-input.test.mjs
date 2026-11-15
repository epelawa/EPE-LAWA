import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseTourismContribution } from "../apps/main/lib/tourism-contribution-input.ts";

const limits = {
  name: 180,
  description: 12_000,
  source_citation: 2_000,
  source_url: 1_000,
  media_url: 1_000,
  media_rights: 2_000,
  visitor_context: 3_000,
  visit_details: 3_000,
};

function makeForm() {
  const form = new FormData();
  form.set("name", "Epe destination");
  form.set("description", "A sufficiently detailed destination description.");
  form.set("source_citation", "Verified public source");
  form.set("source_url", "");
  form.set("media_url", "");
  form.set("media_rights", "");
  form.set("visitor_context", "");
  form.set("visit_details", "");
  form.set("consent", "yes");
  return form;
}

function httpsUrlOfLength(length) {
  const prefix = "https://example.invalid/";
  assert.ok(length >= prefix.length);
  return prefix + "x".repeat(length - prefix.length);
}

test("tourism contribution accepts fields exactly at their server-side limits without changing them", () => {
  const form = makeForm();
  const values = {
    name: "N".repeat(limits.name),
    description: "D".repeat(limits.description),
    source_citation: "S".repeat(limits.source_citation),
    source_url: httpsUrlOfLength(limits.source_url),
    media_url: httpsUrlOfLength(limits.media_url),
    media_rights: "R".repeat(limits.media_rights),
    visitor_context: "V".repeat(limits.visitor_context),
    visit_details: "T".repeat(limits.visit_details),
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);

  const parsed = parseTourismContribution(form);
  assert.ok(parsed);
  assert.equal(parsed.name, values.name);
  assert.equal(parsed.description, values.description);
  assert.equal(parsed.sourceCitation, values.source_citation);
  assert.equal(parsed.sourceUrl, values.source_url);
  assert.equal(parsed.mediaUrl, values.media_url);
  assert.equal(parsed.mediaRights, values.media_rights);
  assert.equal(parsed.visitorContext, values.visitor_context);
  assert.equal(parsed.visitDetails, values.visit_details);
});

test("tourism contribution rejects every field that exceeds its server-side limit", () => {
  for (const [key, maximum] of Object.entries(limits)) {
    const form = makeForm();
    const value = key === "source_url" || key === "media_url"
      ? httpsUrlOfLength(maximum + 1)
      : "x".repeat(maximum + 1);
    form.set(key, value);
    assert.equal(parseTourismContribution(form), null, `${key} over limit must be rejected, not truncated`);
  }
});

test("tourism action validates the complete form before creating a client and inserts parsed values", async () => {
  const action = await readFile(new URL("../apps/main/app/tourism/actions.ts", import.meta.url), "utf8");
  const parseAt = action.indexOf("parseTourismContribution(data)");
  const clientAt = action.indexOf("await createClient()");

  assert.ok(parseAt >= 0, "the action uses the tested parser");
  assert.ok(clientAt > parseAt, "invalid values are rejected before provider access");
  assert.match(action, /if \(!contribution\) redirect\("\/tourism\?submission=invalid"\)/);
  assert.match(action, /description: contribution\.description/);
  assert.doesNotMatch(action, /\.slice\(/, "the server action must not silently truncate submitted fields");
});
