import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const article = await readFile(new URL("app/news/[slug]/page.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const listingStyles = await readFile(new URL("app/news/listing.module.css", root), "utf8");
const footer = await readFile(new URL("components/news-footer.tsx", root), "utf8");
const newsletterCard = await readFile(new URL("components/newsletter-footer-card.tsx", root), "utf8");
const newsletterAvailability = await readFile(new URL("components/newsletter-availability-page.tsx", root), "utf8");

test("News has one fixed composition, without a client timer or layout selector", () => {
  assert.doesNotMatch(page, /NewsLayoutFrame|news-daily-layout|data-news-layout|initialLayout/);
  assert.doesNotMatch(page, /setInterval|setTimeout|useEffect|selectNewsLayout/);
  assert.doesNotMatch(styles, /data-news-layout|breaking-ranked|magazine-sections|reader-focused|compact-topical/);
});

test("the lead image and top headline covers eagerly load and fill their containers", () => {
  assert.match(page, /className=\{styles\.featureImage\}[^>]*loading="eager" fetchPriority="high"/);
  assert.match(page, /className=\{styles\.storyImage\} src=\{image\} alt=""/);
  assert.doesNotMatch(page, /fetchPriority="auto"/);
  assert.match(page, /<search className=\{styles\.searchRegion\} aria-label="Search published stories">/);
  assert.match(listingStyles, /\.featureImage,\.storyImage \{[^}]*object-fit: cover/);
});

test("article hero cover eagerly loads, never lazily, and uses full-container cover fit", () => {
  assert.match(article, /loading="eager" fetchPriority="high"/);
  assert.match(article, /className=\{styles\.articleCoverFrame\}/);
  assert.doesNotMatch(article, /articleHeroImage[^\n]*loading="lazy"/);
  assert.match(styles, /\.articleHeroImage,\.articleHeroFallback \{[^}]*object-fit:cover/);
  assert.match(styles, /\.articleHeroImage\.approvedCoverFull \{[^}]*object-fit:cover/);
  assert.match(styles, /\.relatedImage,\.relatedImageFallback \{[^}]*object-fit:cover/);
});

test("editorial text scales with user settings and headlines wrap cleanly", () => {
  assert.doesNotMatch(styles, /font-size:[^;}]*px/);
  assert.match(styles, /font-size:clamp\(2rem, 1rem \+ 2\.5vw, 2\.875rem\)/);
  assert.match(styles, /text-wrap:balance/);
  assert.doesNotMatch(styles, /font-size:[^;}]*clamp\([^)]*vw[^)]*px/);
});

test("footer categories stay real and shared newsletter paths remain unavailable without collecting data", () => {
  assert.match(footer, /from\("categories"\)/);
  assert.match(footer, /\.eq\("is_active", true\)/);
  assert.match(footer, /NewsletterFooterCard/);
  assert.match(newsletterCard, /No email address is collected here/);
  assert.match(newsletterCard, /Subscription storage, email delivery, unsubscribe handling and abuse controls are not ready/);
  assert.doesNotMatch(newsletterCard + newsletterAvailability, /<form|type="email"|name=["']email["']/i);
  assert.doesNotMatch(newsletterAvailability, /success|subscribed|unsubscribed/i);
});
