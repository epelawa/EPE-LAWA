import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const header = await readFile(new URL("components/site-header.tsx", root), "utf8");
const navigation = await readFile(new URL("components/navigation-refinement.css", root), "utf8");

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

test("News search icon opens an accessible headline form and pagination preserves category/query", () => {
  assert.match(page, /<details className=\{styles\.searchToggle\} open=\{query \? true : undefined\}>/);
  assert.match(page, /aria-label="Search headlines"/);
  assert.match(page, /role="search"/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="category"/);
  assert.match(page, /function pageHref\(page: number, query: string, category: string\)/);
  assert.match(page, /params\.set\("q", query\)/);
  assert.match(page, /params\.set\("category", category\)/);
  assert.match(page, /Newer stories/);
  assert.match(page, /Older stories/);
  assert.match(page, /No published stories in this category/);
});

test("News category tabs remain available without a featured carousel", () => {
  assert.match(page, /<nav className=\{styles\.categoryNav\} aria-label="News categories">/);
});

test("News is image-led with one truthful lead, accessible category tabs and compact story thumbnails", () => {
  assert.match(page, /<h1 className=\{styles\.pageTitle\}>\{lead && isBreakingNow\(lead\) \? "Breaking News" : "News"\}<\/h1>/);
  assert.match(page, /className=\{styles\.featureCard\}/);
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, /aria-current=\{category === item\.slug \? "page" : undefined\}/);
  assert.match(page, /storyThumbnail/);
  assert.match(page, /newsArticlePath\(article\.slug\)/);
  assert.match(styles, /\.featureCard\s*\{/);
  assert.match(styles, /\.storyLink\s*\{/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(max-width: 360px\)/);
  assert.match(styles, /min-height:\s*44px/);
  assert.doesNotMatch(page, /SpaceX|Crew Dragon|iPhone 12/);
});

test("News has plain category tabs and a search icon but no invented filter button or status widget", () => {
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, />All<\/Link>/);
  assert.match(page, /newsSearchForm/);
  assert.doesNotMatch(page, /FilterIcon|newsFilterButton|NewsFeatureStatus/);
  assert.match(styles, /\.featureImage,\.featureImageFallback\s*\{[^}]*aspect-ratio:/);
  assert.match(styles, /\.storyLink\s*\{/);
});

test("mobile News and article routes hide the masthead and keep reference spacing", () => {
  assert.ok(header.includes('pathname === "/news" || pathname.startsWith("/news/")'));
  assert.match(header, /site-head--news-reference/);
  assert.match(navigation, /\.site-head--news-reference\s*\{\s*display:\s*none;\s*\}/);
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.newsPage,\.articlePage \{[\s\S]*?border-radius:\s*32px;/);
  assert.match(styles, /@media \(max-width: 520px\) \{[\s\S]*?\.featureCard \{ border-radius: 24px; \}/);
  assert.match(styles, /\.featureLink \{ margin: 8px 8px 0; border-radius: 16px; \}/);
  assert.match(styles, /\.storyThumbnail,\.storyThumbnailFallback \{ width: 68px; height: 52px; border-radius: 12px; \}/);
  assert.match(styles, /\.articleHeroImage,\.articleHeroFallback \{ border-radius: 16px; \}/);
});

test("News article detail uses a short image-first header on narrow phones", () => {
  assert.ok(styles.includes("height: auto; min-height: 0; aspect-ratio: auto"));
  assert.ok(styles.includes("aspect-ratio: 16/9"));
  assert.ok(styles.includes("color: hsl(var(--foreground))"));
});

test("News pagination remains bounded, avoids count queries and uses deterministic ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows\.length > PAGE_SIZE && page < MAX_PAGE/);
  assert.doesNotMatch(page, /count:\s*"exact"/);
});
