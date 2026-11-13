import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");

test("News queries only published stories and obtains safe cover images from public media keys", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /escapeLike\(query\)/);
  assert.match(page, /\.ilike\("title", `%\$\{escapeLike\(query\)\}%`\)/);
  assert.match(page, /from\("categories"\)/);
  assert.match(page, /\.eq\("is_active", true\)/);
  assert.match(page, /\.eq\("category_slug", category\)/);
  assert.match(page, /og_image_key/);
  assert.match(page, /publicMediaUrl\(article\.og_image_key\)/);
  assert.doesNotMatch(page, /from\("articles"\)|service_role|SUPABASE_SERVICE/);
});

test("News search, category tabs and pagination preserve the public filters safely", () => {
  assert.match(page, /name="q"/);
  assert.match(page, /name="category" value=\{category\}/);
  assert.match(page, /function pageHref\(page: number, query: string, category: string\)/);
  assert.match(page, /params\.set\("q", query\)/);
  assert.match(page, /params\.set\("category", category\)/);
  assert.match(page, /Newer stories/);
  assert.match(page, /Older stories/);
  assert.match(page, /No published stories match/);
});

test("News category filters remain available in empty states and featured guidance matches the rail", () => {
  assert.match(page, /<nav className=\{styles\.categoryNav\} aria-label="News categories">/);
  assert.match(page, /featured\.length > 1 \? "Swipe to explore" : "Featured story"/);
});

test("News is image-led with featured cards, accessible category tabs and compact story thumbnails", () => {
  assert.match(page, /Breaking News/);
  assert.match(page, /featureRail/);
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, /aria-current=\{category === item\.slug \? "page" : undefined\}/);
  assert.match(page, /storyThumbnail/);
  assert.match(page, /Swipe to explore/);
  assert.match(page, /newsArticlePath\(article\.slug\)/);
  assert.match(styles, /\.featureRail\s*\{/);
  assert.match(styles, /\.storyLink\s*\{/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(max-width: 360px\)/);
  assert.match(styles, /scroll-snap-type:\s*x mandatory/);
  assert.match(styles, /min-height:\s*44px/);
  assert.doesNotMatch(page, /SpaceX|Crew Dragon|iPhone 12/);
});

test("News keeps featured reporting before accessible icon filters and a compact search row", () => {
  const featuredPosition = page.indexOf("className={styles.featureSection}");
  const categoriesPosition = page.indexOf('<nav className={styles.categoryNav}');
  const searchPosition = page.indexOf("className={`${styles.newsSearchForm} filter-panel`}");
  assert.ok(featuredPosition >= 0 && featuredPosition < categoriesPosition && categoriesPosition < searchPosition);
  assert.match(page, /aria-label="All published stories"/);
  assert.match(page, /aria-label="Search news"/);
  assert.match(page, /<label className="sr-only" htmlFor="news-query">Search published headlines<\/label>/);
  assert.match(styles, /\.newsSearchForm:global\(\.filter-panel\)\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\) 44px;/);
});

test("News article hero uses a bounded portrait height on narrow phones", () => {
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.articleHero \{ height: clamp\(420px, 125vw, 500px\); min-height: 0; aspect-ratio: auto;/);
});

test("News pagination remains bounded, avoids count queries and uses deterministic ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows\.length > PAGE_SIZE && page < MAX_PAGE/);
  assert.doesNotMatch(page, /count:\s*"exact"/);
});
