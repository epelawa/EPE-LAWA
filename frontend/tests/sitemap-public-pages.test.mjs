import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPublicDetailEntries, publicPaths } from "../apps/main/app/sitemap.ts";

const sitemapSource = await readFile(new URL("../apps/main/app/sitemap.ts", import.meta.url), "utf8");
const robotsSource = await readFile(new URL("../apps/main/app/robots.ts", import.meta.url), "utf8");

test("public sitemap includes the intended public collection indexes and excludes private areas", () => {
  for (const path of ["/news", "/tourism", "/business-directory", "/who-is-who"]) assert.ok(publicPaths.includes(path));
  for (const path of ["/admin", "/members", "/login"]) assert.ok(!publicPaths.includes(path));
});

test("robots policy is crawler-neutral, excludes private admin paths, and advertises the sitemap", () => {
  assert.match(robotsSource, /userAgent:\s*"\*"/);
  assert.match(robotsSource, /allow:\s*"\/"/);
  assert.match(robotsSource, /disallow:\s*\["\/admin"\]/);
  assert.match(robotsSource, /sitemap:\s*absoluteUrl\("\/sitemap\.xml"\)/);
});

test("public detail sitemap entries encode each slug as one URL segment and retain valid publication dates", () => {
  const entries = buildPublicDetailEntries("/who-is-who", [
    { slug: "A person/with spaces", published_at: "2026-02-03T12:00:00Z" },
    { slug: "   ", published_at: "2026-01-01T00:00:00Z" },
    { slug: "missing-date", published_at: "not-a-date" },
    { slug: "x".repeat(301) },
    { slug: null },
  ]);
  assert.equal(entries.length, 2);
  assert.equal(new URL(entries[0].url).pathname, "/who-is-who/A%20person%2Fwith%20spaces");
  assert.equal(entries[0].lastModified.toISOString(), "2026-02-03T12:00:00.000Z");
  assert.equal(new URL(entries[1].url).pathname, "/who-is-who/missing-date");
  assert.equal(entries[1].lastModified, undefined);
});

test("dynamic sitemap sources are publicly published data, not member or staff submissions", () => {
  for (const table of ["published_articles", "tourism_destinations", "published_businesses", "published_people"]) {
    assert.ok(sitemapSource.includes(`from(\"${table}\")`), `missing public source ${table}`);
  }
  assert.match(sitemapSource, /\.not\("published_at", "is", null\)/);
  assert.match(sitemapSource, /\.limit\(MAX_PUBLIC_DETAIL_URLS_PER_SECTION\)/);
  assert.doesNotMatch(sitemapSource, /from\("(?:tourism_submissions|people_corrections|business_claims)"\)/);
});
