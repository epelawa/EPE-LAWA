import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const header = await readFile(new URL("components/site-header.tsx", root), "utf8");
const headerStyles = await readFile(new URL("components/navigation-refinement.css", root), "utf8");
const footer = await readFile(new URL("components/site-footer.tsx", root), "utf8");

test("News queries only published stories and uses active real categories/public media", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /escapeLike\(query\)/);
  assert.match(page, /from\("categories"\)/);
  assert.match(page, /\.eq\("is_active", true\)/);
  assert.match(page, /og_image_key/);
  assert.doesNotMatch(page, /from\("articles"\)|service_role/);
});

test("News retains search, category links and no invented filters", () => {
  assert.match(page, /aria-label="Search headlines"/);
  assert.match(page, /role="search"/);
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, />All<\/Link>/);
  assert.doesNotMatch(page, /FilterIcon|newsFilterButton/);
});

test("News feed has truthful lead/story links and an icon-free empty state", () => {
  assert.match(page, /className=\{styles\.featureCard\}/);
  assert.match(page, /newsArticlePath\(article\.slug\)/);
  assert.match(page, /<EmptyPanel title=/);
  assert.doesNotMatch(page, /EmptyPanel icon=/);
  assert.match(page, /No stories published yet/);
});

test("News masthead/footer remain minimal on News routes", () => {
  assert.ok(header.includes('pathname === "/news" || pathname.startsWith("/news/"'));
  assert.match(headerStyles, /\.site-head--news-reference\s*\{\s*display:\s*none;?\s*\}/);
  assert.ok(footer.includes('pathname === "/news" || pathname.startsWith("/news/"'));
  assert.match(footer, /className="news-route-mark"/);
});

test("News publisher stamp uses the monochrome reference icon rather than a blue accent", () => {
  assert.match(page, /className=\{styles\.publisherAvatar\}[^]*?<NewspaperIcon size=\{17\}/);
  assert.match(styles, /\.publisherAvatar\s*\{[^}]*display:grid[^}]*border-radius:50%[^}]*color:hsl\(var\(--foreground\)\)/);
});

test("News mobile nav is separated and empty/content panels stay flat", () => {
  assert.match(styles, /\.newsPage \{[^}]*width:min\(1160px/);
  assert.match(styles, /@media \(max-width:600px\)/);
  assert.match(styles, /\.newsNav \{[^}]*gap:10px/);
  assert.match(styles, /\.featureCard \{[^}]*border:1px solid/);
  assert.match(styles, /\.storyLink \{[^}]*grid-template-columns/);
  assert.match(styles, /\.newsPage :global\(\.ui-empty\)[^{]*\{[^}]*border-radius:0/s);
  assert.match(styles, /min-height:44px/);
  assert.doesNotMatch(styles, /border-radius:32px|border-radius:24px/);
});

test("editorial rail keeps the story flow independent from sidebar height", () => {
  assert.match(page, /<div className=\{styles\.leadColumn\}>/);
  assert.match(page, /const mainListArticles = listArticles/);
  assert.doesNotMatch(page, /railArticles|initialLayout === "editorial-rail"/);
  assert.match(styles, /\.editorialGrid,\.editorialMain,\.leadColumn \{ display:contents; \}/);
  assert.match(styles, /:global\(\[data-news-layout="editorial-rail"\]\) \.editorialMain \{ display:grid;[^}]*align-items:start;[^}]*row-gap:14px; \}/);
  assert.match(styles, /:global\(\[data-news-layout="editorial-rail"\]\) \.leadColumn \{ display:grid; grid-template-columns:minmax\(0,1fr\); align-content:start; gap:14px; min-width:0; \}/);
});

test("News pagination remains bounded with deterministic ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows.length > PAGE_SIZE/);
});
