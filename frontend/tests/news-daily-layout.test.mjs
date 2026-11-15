import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { currentNewsLayout, DEFAULT_NEWS_LAYOUT, NEWS_LAYOUTS, selectNewsLayout } from "../apps/main/lib/news-daily-layout.mjs";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const frame = await readFile(new URL("app/news/news-layout-frame.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const globalStyles = await readFile(new URL("app/globals.css", root), "utf8");

test("minute bucket maps deterministically to layouts, advances each minute and validates input", () => {
  assert.equal(selectNewsLayout(100), selectNewsLayout(100));
  for (let minute = 0; minute < 20; minute++) assert.notEqual(selectNewsLayout(minute), selectNewsLayout(minute + 1));
  assert.equal(new Set(NEWS_LAYOUTS).size, 4);
  assert.throws(() => selectNewsLayout("2026-11-14"), TypeError);
  assert.equal(currentNewsLayout(new Date(300 * 60_000)), selectNewsLayout(300));
});

test("client frame keeps hydration stable, ticks at minute boundaries, and catches up on visibility", () => {
  assert.match(page, /const initialLayout = DEFAULT_NEWS_LAYOUT/);
  assert.match(page, /<NewsLayoutFrame initialLayout=\{initialLayout\}/);
  assert.match(frame, /useState<Layout>\(initialLayout\)/);
  assert.match(frame, /60_000 - \(Date\.now\(\) % 60_000\)/);
  assert.match(frame, /visibilitychange/);
  assert.match(frame, /setLayout\(selectNewsLayout\(Math\.floor\(Date\.now\(\) \/ 60_000\) - startedAtMinute\)\)/);
  assert.match(frame, /return \(\) => \{ clear\(\); document\.removeEventListener/);
  assert.ok(frame.includes(`active.closest('form[role="search"]')`));
  assert.doesNotMatch(frame, /closest\("\.newsSearchForm"\)/);
  assert.match(frame, /const onVisibility[^\n]+\n\s+schedule\(\);/);
  assert.doesNotMatch(page, /Math\.random|crypto\.random/);
});

test("layout changes presentation only and retains published-only source content", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(frame, /data-news-layout=\{layout\}/);
  for (const layout of NEWS_LAYOUTS) assert.ok(styles.includes(`data-news-layout="${layout}"`), `missing CSS for ${layout}`);
  assert.match(page, /const mainListArticles = listArticles/);
  assert.doesNotMatch(page, /initialLayout === "editorial-rail" \? listArticles/);
  for (const layout of NEWS_LAYOUTS) assert.ok(styles.includes(`data-news-layout="${layout}"`) && styles.includes(`data-news-layout="${layout}"]) .featureCard`), `lead composition does not vary for ${layout}`);
});

test("every minute variant visibly restyles the truthful unboxed empty state without empty-state icons", () => {
  for (const layout of NEWS_LAYOUTS) {
    assert.ok(styles.includes(`.newsPage[data-news-layout="${layout}"] :global(.ui-empty)`), `empty state does not vary for ${layout}`);
  }
  assert.match(styles, /\.newsPage :global\(\.ui-empty\)[^{]*\{[^}]*border-radius:0/s);
  assert.match(styles, /\.newsPage :global\(\.ui-empty__mark\).*display:none/);
  assert.match(styles, /\.newsPage :global\(\.ui-empty__icon\).*display:none/);
  assert.doesNotMatch(styles, /border-left\s*:\s*2px solid var\(--palette-midnight\)/);
  assert.match(page, /<EmptyPanel title=/);
  assert.doesNotMatch(page, /EmptyPanel icon=/);
  assert.match(page, /No stories published yet/);
});

test("News keeps a cloud-blue canvas, a separated flat mini-nav, and an ink-only active category", () => {
  assert.match(globalStyles, /body:has\(\[data-news-layout\]\)[^}]*background-color: var\(--palette-cloud\); background-image: none/);
  assert.doesNotMatch(globalStyles, /body:has\(\[data-news-layout\]\)[^}]*radial-gradient/);
  assert.ok(globalStyles.includes("body:not(:has(.auth-page)):not(:has(.focused-error-shell)):not(:has([data-news-layout]))"));
  assert.match(globalStyles, /body:has\(\[data-news-layout\]\) \.news-route-mark/);
  assert.match(styles, /\.newsPage\s*\{[^}]*padding/);
  assert.match(styles, /\.newsNav\s*\{[^}]*gap:10px/);
  assert.match(styles, /\.newsCurrentLink\s*\{[^}]*border-bottom:2px solid hsl\(var\(--foreground\)\)/);
  assert.match(styles, /\.categoryLink\[aria-current="page"\][^}]*color:hsl\(var\(--foreground\)\)/);
});

test("rejected breaking-ranked never returns and every new visit starts with editorial-rail", () => {
  assert.equal(DEFAULT_NEWS_LAYOUT, "editorial-rail");
  assert.deepEqual(NEWS_LAYOUTS, ["editorial-rail", "magazine-sections", "reader-focused", "compact-topical"]);
  for (let minute = -10000; minute <= 10000; minute++) assert.notEqual(selectNewsLayout(minute), "breaking-ranked");
  assert.doesNotMatch(styles, /breaking-ranked/);
  assert.match(page, /const initialLayout = DEFAULT_NEWS_LAYOUT/);
  assert.match(frame, /const startedAtMinute = Math\.floor\(Date\.now\(\) \/ 60_000\)/);
});
