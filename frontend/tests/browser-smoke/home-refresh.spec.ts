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
  await expect(page.getByRole("heading", { level: 1, name: /Epe\.\s*Closer to home\./i })).toBeVisible();
  await waitForHeroImage(page);
}

test("homepage preserves copy and CTAs, uses a full-height cover hero, and has no bottom bar", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openHome(page, request);

  await expect(page.getByText("A digital home for Epe’s news, heritage, businesses and community voices.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Epe", exact: true })).toHaveAttribute("href", "/tourism");
  await expect(page.getByRole("link", { name: "Read the latest", exact: true })).toHaveAttribute("href", "/news");
  await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
  await expect(page.locator(".home-hero__quicknav, .home-hero__caption, .home-hero__credit, .home-hero__slide-label, .home-hero__counter")).toHaveCount(0);

  const composition = await page.locator(".home-hero__visual").evaluate((hero) => {
    const image = hero.querySelector(".home-hero__photo");
    if (!image) throw new Error("hero image is missing");
    const visual = hero.getBoundingClientRect();
    const style = getComputedStyle(image);
    return { heroHeight: visual.height, viewportHeight: window.innerHeight, objectFit: style.objectFit };
  });
  expect(composition.heroHeight).toBeGreaterThanOrEqual(composition.viewportHeight * 0.9);
  expect(composition.objectFit).toBe("cover");

  const carousel = page.locator('[aria-roledescription="carousel"]');
  await expect(carousel).toHaveCount(1);
  await expect(carousel.locator('[aria-roledescription="slide"]')).toHaveCount(1);
});

test("the original cover hero reaches the viewport bottom across phone, tablet and desktop sizes", async ({ page, request }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page, request);
  for (const [width, height] of [[320, 800], [375, 900], [768, 900], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.locator(".home-hero__visual").evaluate((hero) => {
      const rect = hero.getBoundingClientRect();
      return { bottom: rect.bottom + window.scrollY, viewportHeight: window.innerHeight, fit: getComputedStyle(hero.querySelector(".home-hero__photo")!).objectFit };
    });
    expect(bounds.bottom, `hero should cover to the viewport bottom at ${width}px`).toBeGreaterThanOrEqual(bounds.viewportHeight - 1);
    expect(bounds.fit).toBe("cover");
    await page.screenshot({ path: testInfo.outputPath(`homepage-cover-${width}.png`), fullPage: true });
  }
});

test("autoplay pauses on focus, stays paused after blur, and resumes only after explicit activation", async ({ browser, request }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    await openHome(page, request);
    const carousel = page.locator('[aria-roledescription="carousel"]');
    const pause = carousel.locator(".home-hero__pause");
    await expect(pause).toBeVisible();
    await expect.poll(() => pause.boundingBox()).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    const touchSize = await pause.boundingBox();
    expect(touchSize?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(touchSize?.height ?? 0).toBeGreaterThanOrEqual(44);

    await pause.focus();
    const focusedPhoto = await activePhotoKey(page);
    await page.waitForTimeout(rotationWindowMs);
    expect(await activePhotoKey(page)).toBe(focusedPhoto);

    await pause.blur();
    await page.waitForTimeout(rotationWindowMs);
    expect(await activePhotoKey(page)).toBe(focusedPhoto);

    await pause.tap();
    await page.waitForTimeout(rotationWindowMs + 500);
    expect(await activePhotoKey(page)).not.toBe(focusedPhoto);
  } finally {
    await context.close();
  }
});

test("reduced motion disables hero autoplay while retaining the accessible slide contract", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page, request);

  const carousel = page.locator('[aria-roledescription="carousel"]');
  const slide = carousel.locator('[aria-roledescription="slide"]');
  await expect(slide).toHaveAttribute("role", "group");
  const initialPhoto = await activePhotoKey(page);
  await page.waitForTimeout(rotationWindowMs);
  expect(await activePhotoKey(page)).toBe(initialPhoto);
  await expect(page.locator(".home-hero__pause")).toHaveAttribute("aria-label", /pause|resume/i);
});

test("previous and next photo controls are keyboard-revealed without resting overlays", async ({ page, request }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page, request);

  const carousel = page.locator('[aria-roledescription="carousel"]');
  const previous = carousel.getByRole("button", { name: "Previous Epe photo" });
  const next = carousel.getByRole("button", { name: "Next Epe photo" });
  await expect(previous).toHaveCount(1);
  await expect(next).toHaveCount(1);
  expect(await previous.evaluate((button) => getComputedStyle(button).clipPath)).toContain("inset");
  expect(await next.evaluate((button) => getComputedStyle(button).clipPath)).toContain("inset");

  const slide = carousel.locator('[aria-roledescription="slide"]');
  await previous.focus();
  await expect(previous).toBeFocused();
  await expect(carousel.locator(".home-hero__pause")).toHaveAttribute("aria-label", "Resume automatic Epe photo rotation");
  await expect.poll(() => previous.evaluate((button) => getComputedStyle(button).clipPath)).toBe("none");
  await page.keyboard.press("Enter");
  await expect(slide).toHaveAttribute("aria-label", "2 of 52");

  await next.focus();
  await expect.poll(() => next.evaluate((button) => getComputedStyle(button).clipPath)).toBe("none");
  await page.keyboard.press("Enter");
  await expect(slide).toHaveAttribute("aria-label", "3 of 52");
});

test("photo credits remain available off-hero for all 52 original images", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.goto("/photo-credits");
  await expect(page.getByRole("heading", { level: 1, name: "Photo credits" })).toBeVisible();
  const attributions = page.locator("article[aria-label='Homepage photo attributions']");
  await expect(attributions).toBeVisible();
  await expect(attributions.getByRole("listitem")).toHaveCount(52);
  await expect(attributions.locator('a[rel*="license"]')).toHaveCount(52);
});
