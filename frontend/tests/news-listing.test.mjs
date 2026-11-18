import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/listing.module.css", root), "utf8");
const header = await readFile(new URL("components/site-header.tsx", root), "utf8");
const headerStyles = await readFile(new URL("components/navigation-refinement.css", root), "utf8");
const footer = await readFile(new URL("components/site-footer.tsx", root), "utf8");
const newsFooter = await readFile(new URL("components/news-footer.tsx", root), "utf8");
const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
const newsletter = await readFile(new URL("components/newsletter-form.tsx", root), "utf8");
const newsletterAction = await readFile(new URL("app/newsletter/actions.ts", root), "utf8");
const newsletterMailer = await readFile(new URL("lib/newsletter-mailer.ts", root), "utf8");
const advertise = await readFile(new URL("app/advertise/page.tsx", root), "utf8");

test("News queries only published stories and active real categories", () => {
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /escapeLike\(query\)/);
  assert.match(page, /from\("categories"\)/);
  assert.match(page, /\.eq\("is_active", true\)/);
  assert.match(page, /og_image_key/);
  assert.match(page, /og_image_key,cover_url,cover_alt/);
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
  assert.match(page, /<EmptyPanel\s+title=/);
  assert.match(page, /No stories published yet/);
  assert.match(page, /No unpublished stories are shown/);
  assert.doesNotMatch(page, /featuredHeadline\s*=|sampleStory|mockArticles/);
});

test("News empty and no-results states provide an explore or reset action", () => {
  assert.match(page, /Clear search and filters/);
  assert.match(page, /Back to latest stories/);
  assert.match(page, /Explore EPE LAWA/);
  assert.match(page, /const needsReset = hasSearchOrCategory \|\| page > 1/);
  assert.match(page, /actions=\{needsReset \?/);
});

test("News presents a focused newsroom without promotional blocks", () => {
  assert.match(page, /Read full story/);
  assert.match(page, /aria-labelledby="featured-heading"/);
  assert.match(page, /aria-labelledby="stories-heading"/);
  assert.match(page, /href=\{categoryHref\(query, item\.slug\)\}/);
  assert.doesNotMatch(page, /topicImages|discoverBanner|newsletterCard|popularCard/);
});

test("Breaking news is visible only for a flagged, unexpired published lead", () => {
  assert.match(page, /function isBreakingNow\(item: ArticleListItem\)/);
  assert.match(page, /breaking_until.*Date\.now\(\)/);
  assert.match(page, /breakingStories\.length \? <section className=\{styles\.breakingBanner\}/);
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

test("News uses the shared editorial footer once and protected routes do not show it", () => {
  assert.doesNotMatch(page, /<NewsFooter/);
  assert.match(layout, /<SiteFooter><NewsFooter listing \/><\/SiteFooter>/);
  assert.match(footer, /pathname\.startsWith\("\/admin\/"\)/);
  assert.match(footer, /pathname\.startsWith\("\/dashboard\/"\)/);
  assert.match(footer, /if \(isProtected\) return null/);
  for (const heading of ["Quick Links", "Categories", "Newsletter"]) assert.ok(newsFooter.includes(heading));
  assert.match(newsFooter, /href="\/advertise"/);
  assert.match(newsFooter, /Contact availability/);
  assert.match(newsFooter, /from\("categories"\)/);
});

test("public footers and correction links do not imply that unavailable contact intake works", async () => {
  const contact = await readFile(new URL("app/contact/page.tsx", root), "utf8");
  const article = await readFile(new URL("app/news/[slug]/page.tsx", root), "utf8");
  const informationPage = await readFile(new URL("components/information-page.tsx", root), "utf8");
  const errorPage = await readFile(new URL("app/error.tsx", root), "utf8");
  assert.match(newsFooter, /Contact availability/);
  assert.doesNotMatch(newsFooter, /Messages are not accepted yet|Contact the team|Have something to share\?/);
  assert.match(informationPage, /Contact availability/);
  assert.doesNotMatch(informationPage, /Contact the team/);
  assert.match(errorPage, /View contact availability/);
  assert.doesNotMatch(errorPage, /contact the team|with the page address/i);
  assert.match(contact, /nothing is sent or stored/);
  assert.match(article, /Correction reporting is not available through this site yet/);
  assert.match(article, /View contact availability/);
  assert.doesNotMatch(article, /contact the newsroom/i);
});

test("Newsletter uses the standalone form/action/mailer path and preserves truthful delivery errors", () => {
  assert.match(newsletter, /useActionState\(subscribeNewsletter/);
  assert.match(newsletter, /name="email"/);
  assert.match(newsletterAction, /newsletter_subscribe_request/);
  assert.match(newsletterAction, /sendNewsletterConfirmation/);
  assert.match(newsletterMailer, /NEWSLETTER_SMTP_HOST/);
  assert.match(newsletterMailer, /newsletter\/unsubscribe\?token=/);
  assert.doesNotMatch(newsletterAction, /auth\.signInWithOtp|auth\.verifyOtp|emailRedirectTo/);
  assert.match(advertise, /does not collect or store contact details/);
  assert.match(advertise, /Enquiries unavailable/);
  assert.doesNotMatch(advertise, /<form|action=|mailto:/);
});

test("News lead and cards load covers with appropriate priority", () => {
  assert.match(page, /className=\{styles\.featureImage\}[^>]*loading="eager" fetchPriority="high"/);
  assert.match(page, /className=\{styles\.storyImage\} src=\{image\} alt=""/);
  assert.match(styles, /\.featureImage,\.storyImage \{[^}]*object-fit: cover/);
});

test("News content keeps a responsive editorial grid and accessible 48px controls", () => {
  assert.match(styles, /\.storyGrid \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /\.categoryLink \{[^}]*min-height: 48px/);
  assert.match(styles, /\.searchSummary \{[^}]*min-height: 48px/);
  assert.match(page, /<details className=\{styles\.categoryDropdown\}>/);
  assert.match(page, /Load more news/);
  assert.match(page, /View all available news/);
  assert.match(page, /className=\{styles\.filterTools\}/);
  assert.match(styles, /\.filterTools \.newsSearchForm input[^}]*border-radius:999px/);
  assert.match(styles, /@keyframes newsroom-rise/);
});

test("News pagination remains bounded with deterministic published ordering", () => {
  assert.match(page, /const PAGE_SIZE = 30/);
  assert.match(page, /const MAX_PAGE = 1000/);
  assert.match(page, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(page, /\.order\("slug", \{ ascending: true \}\)/);
  assert.match(page, /const hasOlder = rows\.length > PAGE_SIZE/);
});


test("News lists newest stories first and groups later stories by real category", () => {
  assert.match(page, /remaining\.slice\(0, 6\)/);
  assert.match(page, /remaining\.slice\(6\)/);
  assert.match(page, /grouped\.get\(story\.category_slug\)/);
  assert.match(page, /categoryHref\("", slug\)/);
});
