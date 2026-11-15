import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readPublishedArticleBody } from "../apps/main/lib/published-article-body.ts";

function fixture(pointer = "public-v1", pointerError = null) {
  const calls = [];
  const versions = [
    { id: "private-v2", article_id: "story", body: "PRIVATE DRAFT" },
    { id: "public-v1", article_id: "story", body: "PUBLIC BODY" },
    { id: "other", article_id: "other-story", body: "OTHER STORY" },
  ];
  return { calls, client: { from(table) {
    const filters = {};
    calls.push({ table, filters });
    const query = {
      select(columns) { calls.at(-1).columns = columns; return query; },
      eq(column, value) { filters[column] = value; return query; },
      async maybeSingle() {
        if (table === "articles") return { data: pointer ? { published_version_id: pointer } : null, error: pointerError };
        const row = versions.find(item => Object.entries(filters).every(([key,value]) => item[key] === value));
        return { data: row ? { body: row.body } : null, error: null };
      },
    };
    return query;
  } } };
}

test("actual public body helper pins article and exact published version despite newer staff-visible draft", async () => {
  const { client, calls } = fixture();
  const result = await readPublishedArticleBody(client, "story");
  assert.equal(result.data.body, "PUBLIC BODY");
  assert.deepEqual(calls[1].filters, { article_id: "story", id: "public-v1" });
  const page = await readFile(new URL("../apps/main/app/news/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /readPublishedArticleBody\(supabase, article\.id\)/);
  assert.doesNotMatch(page, /article_versions[\s\S]{0,160}?\.limit\(1\)/);
});

test("missing or failed publication pointer fails closed without reading any draft", async () => {
  for (const [pointer, error] of [[null, null], ["public-v1", { code: "denied" }]]) {
    const { client, calls } = fixture(pointer, error);
    const result = await readPublishedArticleBody(client, "story");
    assert.equal(result.data, null);
    assert.equal(calls.length, 1);
  }
});

test("missing published body never falls back to an accessible private version", async () => {
  const { client } = fixture("missing-version");
  assert.equal((await readPublishedArticleBody(client, "story")).data, null);
});
