import { expect, test, type APIRequestContext, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const viewportWidths = [320, 375, 600, 767, 768, 800, 960, 1024, 1440] as const;
const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const smokeBaseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";
const syntheticMemberId = "00000000-0000-4000-8000-000000000001";
const syntheticAccessToken = "browser-smoke-synthetic-access-token";

async function setFixtureMode(request: APIRequestContext, mode: "empty" | "error" | "member") {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function addSyntheticMemberSession(context: BrowserContext) {
  const now = Math.floor(Date.now() / 1_000);
  const session = {
    access_token: syntheticAccessToken,
    refresh_token: "browser-smoke-synthetic-refresh-token",
    token_type: "bearer",
    expires_in: 3_600,
    expires_at: now + 3_600,
    user: {
      id: syntheticMemberId,
      aud: "authenticated",
      role: "authenticated",
      email: "browser-smoke-member@example.test",
      email_confirmed_at: "2026-01-01T00:00:00.000Z",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
    },
  };
  await context.addCookies([{
    name: "sb-localhost-auth-token",
    value: `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`,
    url: smokeBaseURL,
    httpOnly: true,
    sameSite: "Lax",
  }]);
}

async function expectNoHorizontalOverflow(page: Page, location: string) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(widths.document, widths.body), `${location} should not overflow horizontally`).toBeLessThanOrEqual(widths.viewport + 1);
}

async function captureEvidence(page: Page, route: "home" | "news" | "tourism" | "dashboard", width: number) {
  const directory = process.env.SMOKE_SCREENSHOT_DIR;
  if (!directory || (width !== 320 && width !== 375 && width !== 1440)) return;
  await expect(page.locator(".site-preloader")).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  if (route === "home") {
    await expect.poll(() => page.locator(".home-hero__photo").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await mkdir(directory, { recursive: true });
  const label = (process.env.SMOKE_EVIDENCE_LABEL ?? "local").replace(/[^a-zA-Z0-9._-]/g, "-");
  await page.screenshot({ path: resolve(directory, `${label}-nav-${route}-${width}.png`), fullPage: false });
}

async function expectBarVisibility(nav: Locator, width: number) {
  if (width <= 767) await expect(nav).toBeVisible();
  else await expect(nav).toBeHidden();
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 40) {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach the target by keyboard within ${maxTabs} tabs`);
}

test("home-only nav hiding and public/member destinations stay responsive across nine widths", async ({ browser, request }) => {
  // This single scenario traverses nine widths and four routes on one dev server.
  // Preserve all route and viewport assertions while allowing the full journey to finish.
  test.setTimeout(300_000);
  const context = await browser.newContext({
    baseURL: smokeBaseURL,
    viewport: { width: 320, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await addSyntheticMemberSession(context);

  try {
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await setFixtureMode(request, "empty");
      const homeResponse = await page.goto("/");
      expect(homeResponse?.status(), `homepage at ${width}px should respond`).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: /Epe\.\s*Closer to home\./i })).toBeVisible();
      await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
      await expectNoHorizontalOverflow(page, `homepage at ${width}px`);
      await captureEvidence(page, "home", width);

      await page.goto("/news");
      await expect(page.getByRole("heading", { level: 1, name: "Latest News" })).toBeVisible();
      const newsNavigation = page.locator(".mobile-bottom-nav");
      await expect(newsNavigation).toHaveCount(1);
      await expect(newsNavigation).toHaveAttribute("aria-label", "Mobile primary navigation");
      await expect(newsNavigation.locator("a")).toHaveText(["Home", "News", "Discover", "Account"]);
      await expect(newsNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/news");
      await expectBarVisibility(newsNavigation, width);
      await expectNoHorizontalOverflow(page, `News at ${width}px`);
      await captureEvidence(page, "news", width);

      await page.goto("/tourism");
      await expect(page.getByRole("heading", { level: 1, name: "Historical Sites & Tourism" })).toBeVisible();
      const discoverNavigation = page.locator(".mobile-bottom-nav");
      await expect(discoverNavigation).toHaveCount(1);
      await expect(discoverNavigation).toHaveAttribute("aria-label", "Mobile primary navigation");
      await expect(discoverNavigation.locator("a")).toHaveText(["Home", "News", "Discover", "Account"]);
      await expect(discoverNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/tourism");
      await expectBarVisibility(discoverNavigation, width);
      await expectNoHorizontalOverflow(page, `Discover/Tourism at ${width}px`);
      await captureEvidence(page, "tourism", width);

      await setFixtureMode(request, "member");
      await page.goto("/dashboard");
      await expect(page).toHaveURL(new URL("/dashboard", smokeBaseURL).href);
      await expect(page.getByRole("heading", { level: 1, name: "Welcome, Browser Smoke Member." })).toBeVisible();
      const dashboardNavigation = page.locator(".mobile-bottom-nav");
      await expect(dashboardNavigation).toHaveCount(1);
      await expect(dashboardNavigation).toHaveClass(/mobile-bottom-nav--dashboard/);
      await expect(dashboardNavigation).toHaveAttribute("aria-label", "Member dashboard navigation");
      await expect(dashboardNavigation.locator("a")).toHaveText(["Home", "Discover", "Saved", "Profile"]);
      await expect(dashboardNavigation.getByRole("link", { name: "Account", exact: true })).toHaveCount(0);
      await expect(dashboardNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/dashboard#home");
      await expectBarVisibility(dashboardNavigation, width);
      await expectNoHorizontalOverflow(page, `Account dashboard at ${width}px`);
      await captureEvidence(page, "dashboard", width);
      console.log(`PASS route-specific navigation at ${width}px`);
    }
    expect(pageErrors, `browser runtime errors: ${pageErrors.join("; ")}`).toEqual([]);
  } finally {
    await context.close();
  }
});

test("public tabs and signed-in dashboard tabs activate their real destinations on mobile", async ({ browser, request }) => {
  await setFixtureMode(request, "empty");
  const context = await browser.newContext({
    baseURL: smokeBaseURL,
    viewport: { width: 375, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    await page.goto("/news");
    let navigation = page.locator(".mobile-bottom-nav");
    await navigation.getByRole("link", { name: "Discover", exact: true }).tap();
    await expect(page).toHaveURL(new URL("/tourism", smokeBaseURL).href);
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/tourism");
    await navigation.getByRole("link", { name: "News", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new URL("/news", smokeBaseURL).href);
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/news");
    await navigation.getByRole("link", { name: "Home", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new URL("/", smokeBaseURL).href);
    await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);

    await addSyntheticMemberSession(context);
    await setFixtureMode(request, "member");
    await page.goto("/dashboard");
    const dashboardNavigation = page.locator(".mobile-bottom-nav--dashboard");
    for (const [label, hash, id] of [
      ["Home", "#home", "home"],
      ["Discover", "#discover", "discover"],
      ["Saved", "#saved", "saved"],
      ["Profile", "#profile", "profile"],
    ] as const) {
      const tab = dashboardNavigation.getByRole("link", { name: label, exact: true });
      await tab.focus();
      await expect(tab).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new URL(`/dashboard${hash}`, smokeBaseURL).href);
      await expect(tab).toHaveAttribute("aria-current", "page");
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expect(page.locator("#saved")).toContainText("cannot display or store saved items");
  } finally {
    await context.close();
  }
});

test("homepage photo carousel rotates automatically and exposes a focus-only pause control", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const carousel = page.getByRole("group", { name: "Photographs of Epe", exact: true });
  const slideLabel = carousel.locator(".home-hero__slide-label");
  await expect(slideLabel).not.toHaveText("");
  await expect.poll(() => carousel.locator(".home-hero__photo").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const initialLabel = (await slideLabel.textContent())?.trim() ?? "";
  expect(initialLabel).not.toBe("");

  const pauseButton = carousel.locator(".home-hero__pause");
  await expect(pauseButton).toHaveAttribute("aria-label", "Pause automatic Epe photo rotation");
  expect(await pauseButton.evaluate((element) => getComputedStyle(element).clipPath)).toBe("inset(50%)");
  await expect(slideLabel).not.toHaveText(initialLabel, { timeout: 10_000 });

  await tabUntilFocused(page, pauseButton);
  await expect(pauseButton).toBeFocused();
  expect(await pauseButton.evaluate((element) => getComputedStyle(element).clipPath)).toBe("none");
  await page.keyboard.press("Enter");
  await expect(pauseButton).toHaveAttribute("aria-pressed", "true");
  const pausedLabel = (await slideLabel.textContent())?.trim() ?? "";
  await page.waitForTimeout(7_400);
  await expect(slideLabel).toHaveText(pausedLabel);
});
