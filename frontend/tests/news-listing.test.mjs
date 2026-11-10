import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../apps/main/app/news/page.tsx", import.meta.url), "utf8");

test("News search uses escaped title matching on the published-only view", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /escapeLike\(query\)/);
  assert.match(page, /\.ilike\("title", `%\$\{escapeLike\(query\)\}%`\)/);
  assert.match(page, /name="q"/);
  assert.doesNotMatch(page, /from\("articles"\)|service_role|SUPABASE_SERVICE/);
});

test("News pagination is bounded, avoids exact-count queries and has deterministic ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows\.length > PAGE_SIZE && page < MAX_PAGE/);
  assert.doesNotMatch(page, /count:\s*"exact"/);
});

test("News page navigation preserves a title search and distinguishes empty results", () => {
  assert.match(page, /function pageHref\(page: number, query: string\)/);
  assert.match(page, /params\.set\("q", query\)/);
  assert.match(page, /Newer stories/);
  assert.match(page, /Older stories/);
  assert.match(page, /No stories match this search/);
  assert.match(page, /No stories published yet/);
});
