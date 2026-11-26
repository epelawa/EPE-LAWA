import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const smokeBaseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";
const rotationWindowMs = 8_000;

async function setFixtureMode(request: APIRequestContext, mode: "empty" | "error") {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function waitForHeroImage(page: Page) {
  await expect(page.locator(".home-hero__photo")).toHaveCount(1);
  await expect.poll(() => page.locator(".home-hero__photo").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

async function activePhotoKey(page: Page) {
  return page.locator(".home-hero__photo").evaluate((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src);
}

async function openHome(page: Page, request: APIRequestContext) {
  await setFixtureMode(request, "empty");
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Stay Connected, Stay Informed" })).toBeVisible();
  await waitForHeroImage(page);
  await expect(page.locator(".site-preloader")).toHaveCount(0);
}

test("homepage offers compact news, radio and community navigation", async ({ page, request }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page, request);
  for (const [width, height] of [[320, 800], [375, 900], [768, 900], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".home-hero__content")).toHaveCSS("text-align", "center");
    await expect(page.locator(".home-hero__brand")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Read latest news", exact: true })).toHaveAttribute("href", "/news");
    await expect(page.getByRole("link", { name: /Listen to radio/ }).first()).toHaveAttribute("href", "/radio");
    await expect(page.getByRole("navigation", { name: "Explore EPE LAWA" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest News" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`homepage-${width}.png`), fullPage: true });
  }
});

test("hero pauses while keyboard focus is inside and resumes after focus leaves", async ({ page, request }) => {
  test.setTimeout(40_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openHome(page, request);
  const link = page.getByRole("link", { name: "Read latest news", exact: true });
  await link.focus();
  const photo = await activePhotoKey(page);
  await page.waitForTimeout(rotationWindowMs);
  expect(await activePhotoKey(page)).toBe(photo);
  await link.blur();
  await page.waitForTimeout(rotationWindowMs + 500);
  expect(await activePhotoKey(page)).not.toBe(photo);
  await expect(page.locator(".home-photo-control__button")).toHaveCount(0);
});

test("reduced motion disables hero autoplay while retaining the accessible slide contract", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page, request);

  const heroAnimations = await page.locator(".home-hero__content h1, .home-hero__lede, .home-hero__actions").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName));
  expect(heroAnimations).toEqual(["none", "none", "none"]);

  const carousel = page.locator('[aria-roledescription="carousel"]');
  const slide = carousel.locator('[aria-roledescription="slide"]');
  await expect(slide).toHaveAttribute("role", "group");
  const initialPhoto = await activePhotoKey(page);
  await page.waitForTimeout(rotationWindowMs);
  expect(await activePhotoKey(page)).toBe(initialPhoto);
  await expect(page.locator(".home-photo-control__button")).toHaveCount(0);
});

test("hero photos rotate without a visible pause button", async ({ page, request }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openHome(page, request);
  await expect(page.getByRole("button", { name: /pause photos|play photos/i })).toHaveCount(0);
  const initialPhoto = await activePhotoKey(page);
  await page.waitForTimeout(rotationWindowMs + 500);
  expect(await activePhotoKey(page)).not.toBe(initialPhoto);
});

test("photo credits remain available off-hero for all 52 credited photos and the two originals", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.goto("/photo-credits");
  await expect(page.getByRole("heading", { level: 1, name: "Photo credits" })).toBeVisible();
  const attributions = page.locator("article[aria-label='Homepage photo attributions']");
  await expect(attributions).toBeVisible();
  await expect(attributions.getByRole("listitem")).toHaveCount(54);
  await expect(attributions.locator('a[rel*="license"]')).toHaveCount(54);
});


test("hero streams before slow news and only news displays a skeleton", async ({ page, request }) => {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "slow-stories" } });
  expect(response.ok()).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1, name: "Stay Connected, Stay Informed" })).toBeVisible({ timeout: 4000 });
  await expect(page.getByRole("status", { name: "Latest news" })).toBeVisible();
  await expect(page.locator(".home-news-skeleton__card")).toHaveCount(3);
  await expect(page.locator(".home-hero__brand")).toHaveCount(0);
  await expect(page.locator(".home-hero__content")).toHaveCSS("text-align", "center");
  await expect(page.locator(".home-story-card").first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".home-news-skeleton")).toHaveCount(0);
  await setFixtureMode(request, "empty");
});


test("homepage fonts load from the site rather than Google", async ({ page, request }) => {
  const fontRequests: string[] = [];
  const isGoogleFontHost = (url: string) => ["fonts.googleapis.com", "fonts.gstatic.com"].includes(new URL(url).hostname);
  page.on("request", (request) => { if (request.resourceType() === "font" || isGoogleFontHost(request.url())) fontRequests.push(request.url()); });
  await openHome(page, request);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Plus Jakarta Sans Variable"'))).toBeTruthy();
  expect(fontRequests.some((url) => url.includes(".woff2") && new URL(url).origin === new URL(smokeBaseURL).origin)).toBeTruthy();
  expect(fontRequests.some(isGoogleFontHost)).toBeFalsy();
});
