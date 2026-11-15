import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const header = await readFile(new URL("components/site-header.tsx", root), "utf8");
const headerStyles = await readFile(new URL("components/navigation-refinement.css", root), "utf8");
const footer = await readFile(new URL("components/site-footer.tsx", root), "utf8");
const newsFooter = await readFile(new URL("components/news-footer.tsx", root), "utf8");
const newsletter = await readFile(new URL("components/newsletter-unavailable.tsx", root), "utf8");
const advertise = await readFile(new URL("app/advertise/page.tsx", root), "utf8");

test("News queries only published stories and active real categories", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /escapeLike\(query\)/);
  assert.match(page, /from\("categories"\)/);
  assert.match(page, /\.eq\("is_active", true\)/);
  assert.match(page, /og_image_key,cover_url/);
  assert.doesNotMatch(page, /from\("articles"\)|service_role/);
});

test("News retains search, category links and no invented filters", () => {
  assert.match(page, /aria-label="Search headlines"/);
  assert.match(page, /<search className=\{styles\.searchRegion\} aria-label="Search published stories">/);
  assert.match(page, /params\.search === "1"/);
  assert.match(page, /open=\{searchOpen \|\| undefined\}/);
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, />All<\/Link>/);
  assert.doesNotMatch(page, /FilterIcon|newsFilterButton/);
});

test("News feed uses real story links and truthful empty/error states", () => {
  assert.match(page, /newsArticlePath\(lead\.slug\)/);
  assert.match(page, /newsArticlePath\(article\.slug\)/);
  assert.match(page, /<EmptyPanel title=/);
  assert.match(page, /No stories published yet/);
  assert.match(page, /No unpublished stories are shown/);
  assert.doesNotMatch(page, /featuredHeadline\s*=|sampleStory|mockArticles/);
});

test("News reference composition keeps an actionable lead and local-image topic explorer", () => {
  assert.match(page, /Read full story/);
  assert.match(page, /aria-labelledby="topics-heading"/);
  assert.match(page, /topicImages/);
  assert.match(page, /href=\{categoryHref\(query, item\.slug\)\}/);
  assert.match(styles, /\.topicGrid \{[^}]*grid-template-columns:repeat\(6/);
  assert.match(styles, /\.topicImage \{[^}]*border-radius:50%/);
  assert.match(styles, /\.featureAction \{[^}]*border-radius:999px/);
  assert.match(page, /className=\{styles\.discoverBanner\}/);
  assert.match(styles, /\.discoverBanner \{[^}]*border-radius:16px/);
  assert.match(styles, /\.newsletterCard,.popularCard \{[^}]*border-radius:16px/);
});

test("Breaking news is visible only for a flagged, unexpired published lead", () => {
  assert.match(page, /function isBreakingNow\(item: ArticleListItem\)/);
  assert.match(page, /breaking_until.*Date\.now\(\)/);
  assert.match(page, /breakingLead \? <section className=\{styles\.breakingBanner\}/);
  assert.match(page, /aria-label="Breaking news"/);
  assert.match(styles, /\.breakingBanner \{/);
});

test("News uses the shared public shell and keeps its cobalt search and route entry points", () => {
  assert.match(header, /const isNewsReference = pathname === "\/news"/);
  assert.match(header, /const DESKTOP_GROUPS =/);
  assert.match(header, /const MOBILE_GROUPS =/);
  assert.match(header, /href="\/news\?search=1"/);
  assert.match(headerStyles, /\.site-head--news-reference\s*\{\s*display: block/);
  assert.match(header, /"\/advertise"/);
  assert.doesNotMatch(header + headerStyles, /news-utilitybar|#063d2b|#0b4a32/);
  assert.doesNotMatch(headerStyles, /site-head--news-reference\s*\{\s*display:\s*none/);
});

test("News page and editorial footer use the same cobalt and navy identity", async () => {
  const newsStyles = await readFile(new URL("app/news/news.module.css", root), "utf8");
  const footerStyles = await readFile(new URL("components/news-footer.module.css", root), "utf8");
  assert.match(newsStyles, /--news-blue:#294B91/);
  assert.match(footerStyles, /background:#17264A/);
  assert.doesNotMatch(newsStyles + footerStyles, /#(?:0b4a32|063d2b|0b7042|16894d)|rgb\(0 69 44|rgb\(10 40 26/);
});

test("News and Advertise use the complete reference-style footer without a duplicate global footer", () => {
  assert.match(page, /<NewsFooter categories=\{categories\} \/>/);
  assert.match(footer, /pathname\.startsWith\("\/news\/"\) \|\| pathname === "\/advertise"/);
  assert.match(footer, /if \(isEditorial\) return null/);
  for (const heading of ["Quick Links", "Categories", "Newsletter"]) assert.ok(newsFooter.includes(heading));
  assert.match(newsFooter, /href="\/advertise"/);
  assert.match(newsFooter, /from\("categories"\)/);
});

test("Newsletter and advertising states do not pretend to accept or deliver submissions", () => {
  assert.match(newsletter, /disabled/);
  assert.match(newsletter, /no email address is collected/);
  assert.doesNotMatch(newsletter, /<form|action=|name="email"/);
  assert.match(advertise, /does not collect or store contact details/);
  assert.match(advertise, /Enquiries unavailable/);
  assert.doesNotMatch(advertise, /<form|action=|mailto:/);
});

test("News lead and cards eagerly load above-fold covers that fill their containers", () => {
  assert.match(page, /className=\{styles\.featureImage\}[^>]*loading="eager" fetchPriority="high"/);
  assert.match(page, /loading="eager" decoding="async" referrerPolicy="no-referrer"/);
  assert.match(page, /className=\{styles\.headlineImage\} src=\{image\} alt="" loading="eager"/);
  assert.match(page, /className=\{styles\.storyImage\} src=\{image\} alt="" loading="lazy"/);
  assert.doesNotMatch(page, /fetchPriority="auto"/);
  assert.match(styles, /\.featureImage,\.featureImageFallback \{[^}]*object-fit:cover/);
  assert.match(styles, /\.headlineImage,\.headlineImageFallback \{[^}]*object-fit:cover/);
  assert.match(styles, /\.storyImage,\.storyImageFallback \{[^}]*object-fit:cover/);
  assert.doesNotMatch(styles, /object-fit:\s*contain/);
});

test("News content keeps a responsive editorial grid and accessible 48px controls", () => {
  assert.match(styles, /\.newsPageGrid \{[^}]*grid-template-columns:minmax\(0,1fr\) 294px/);
  assert.match(styles, /@media \(max-width:600px\)/);
  assert.match(styles, /\.categoryLink \{[^}]*min-height:48px/);
  assert.match(styles, /\.searchSummary \{[^}]*min-height:48px/);
  assert.match(styles, /\.featureCard \{[^}]*aspect-ratio/);
});

test("News pagination remains bounded with deterministic published ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows\.length > PAGE_SIZE/);
});
