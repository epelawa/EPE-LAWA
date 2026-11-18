import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const viewportWidths = [320, 375, 768, 1024, 1440] as const;
const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const noResultsQuery = "browser-smoke-no-results";
const mainNavigationName = /^Primary navigation$/;
const newsLinkName = /News/;

async function setFixtureMode(request: APIRequestContext, mode: "empty" | "error" | "stories" | "news-many") {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function expectNoHorizontalOverflow(page: Page, location: string) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(widths.document, widths.body), `${location} should not overflow horizontally`).toBeLessThanOrEqual(widths.viewport + 1);
}

async function captureEvidence(page: Page, route: "home" | "news", width: number) {
  const directory = process.env.SMOKE_SCREENSHOT_DIR;
  if (!directory || (width !== 320 && width !== 1440)) return;
  await mkdir(directory, { recursive: true });
  const label = (process.env.SMOKE_EVIDENCE_LABEL ?? "local").replace(/[^a-zA-Z0-9._-]/g, "-");
  await page.screenshot({ path: resolve(directory, `${label}-${route}-${width}.png`), fullPage: true });
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 12) {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach the target by keyboard within ${maxTabs} tabs`);
}

function maxCssDurationMilliseconds(value: string): number {
  return Math.max(...value.split(",").map((part) => {
    const duration = Number.parseFloat(part.trim()) || 0;
    return part.trim().endsWith("ms") ? duration : duration * 1_000;
  }));
}

for (const width of viewportWidths) {
  test(`public homepage, News, no-results/error states, and overflow at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "empty");
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Stay Connected, Stay Informed" })).toBeVisible();
    await expect(page.locator(".home-hero__client-art")).toHaveCount(0);
    await expect(page.locator(".site-head--home").getByText("The Voice of Epe Division")).toBeVisible();
    await expect(page.locator(".site-head__menu .menu-lines span")).toHaveCount(2);
    const background = await page.locator("body").evaluate((body) => ({ image: getComputedStyle(body).backgroundImage, size: getComputedStyle(body).backgroundSize }));
    expect(background.image).not.toContain("linear-gradient(90deg");
    expect((background.image.match(/radial-gradient\(circle/g) ?? []).length).toBe(2);
    expect(background.size).toContain("16px 16px");
    await expect(page.getByRole("heading", { level: 2, name: "Latest News" })).toBeVisible();
    await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
    await captureEvidence(page, "home", width);
    await expectNoHorizontalOverflow(page, `homepage at ${width}px`);

    const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
    const newsLink = mainNavigation.getByRole("link", { name: newsLinkName });
    if (await newsLink.isVisible()) {
      await newsLink.click();
      await expect(newsLink).toHaveAttribute("aria-current", "page");
    } else {
      await page.getByRole("link", { name: "Read latest news", exact: true }).click();
    }

    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole("heading", { level: 1, name: "News from Epe." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No stories published yet" })).toBeVisible();
    await captureEvidence(page, "news", width);
    await expectNoHorizontalOverflow(page, `News empty state at ${width}px`);

    const search = page.getByRole("searchbox", { name: "Search stories, topics and authors" });
    await expect(search).toBeVisible();
    await search.fill(noResultsQuery);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/news\\?q=${noResultsQuery}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Search results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No matching stories" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `News no-results state at ${width}px`);

    await setFixtureMode(request, "error");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The newsroom is unavailable right now" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `homepage error state at ${width}px`);
    await page.goto("/news");
    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole("heading", { level: 1, name: "News" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The newsroom did not load" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `News error state at ${width}px`);
  });
}

for (const width of viewportWidths) {
  test(`populated newsroom works at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "stories");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/news");
    await expect(page.getByRole("heading", { name: "Featured story" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest reports" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Smoke fixture: market story" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Breaking news" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `populated News at ${width}px`);
    await page.getByRole("searchbox", { name: "Search stories, topics and authors" }).fill("market");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Smoke fixture: market story" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Smoke fixture: sports story" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, `filtered News at ${width}px`);
  });
}

for (const width of [320, 375, 768, 1024, 1440] as const) {
  test(`news groups, linked covers and pagination at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "news-many");
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://images.example.com/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" />' }));
    await page.goto("/news");
    await expect(page.getByRole("heading", { name: "Test story 1", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sports stories" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Local News stories" })).toBeVisible();
    await expect(page.locator('img[src="https://images.example.com/test-cover.jpg"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Load more news" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `grouped News at ${width}px`);
    await page.getByRole("link", { name: "Read: Test story 1" }).click();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://images.example.com/test-cover.jpg");
    await expect(page.getByRole("img", { name: "Synthetic cover" })).toBeVisible();
    await expect(page.getByText("Synthetic article for browser testing.")).toBeVisible();
    await expect(page.getByText("Second published paragraph.")).toBeVisible();
    await expect(page.getByText("Final published paragraph.")).toBeVisible();
    await expect(page.getByText("Photo: Test photographer")).toBeVisible();
    await page.goto("/news?page=2");
    await expect(page.getByRole("heading", { name: "Test story 31", exact: true })).toBeVisible();
  });
}

test("homepage news link opens the newsroom at the top", async ({ page, request }) => {
  await setFixtureMode(request, "stories");
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const link = page.getByRole("link", { name: "Read latest news", exact: true });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole("heading", { level: 1, name: "News from Epe." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  await page.getByRole("navigation", { name: "News categories", exact: true }).getByRole("link", { name: "Sports" }).click();
  await expect(page).toHaveURL(/category=sports/);
  await expect(page.getByRole("heading", { name: "Smoke fixture: sports story" })).toBeVisible();
});

for (const width of [320, 375, 768, 1024] as const) {
  test(`keyboard navigation and focus behavior at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "empty");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();

    const menuButton = page.getByRole("button", { name: "Open navigation menu", exact: true });
    if (await menuButton.isVisible()) {
      await tabUntilFocused(page, menuButton);
      await page.keyboard.press("Enter");

      const drawer = page.getByRole("dialog", { name: "Find your place in Epe." });
      await expect(drawer).toBeVisible();
      const closeButton = drawer.getByRole("button", { name: "Close navigation menu" });
      await expect(closeButton).toBeFocused();
      await expect(drawer.getByRole("link", { name: /Forum/i })).toHaveAttribute("href", "/forum");
      await page.keyboard.press("Shift+Tab");
      await expect(drawer.getByRole("link", { name: "Sign in", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(menuButton).toBeFocused();

      await page.keyboard.press("Enter");
      await expect(drawer).toBeVisible();
      await expect(closeButton).toBeFocused();
      await page.keyboard.press("Tab");
      const drawerNewsLink = drawer.getByRole("link", { name: newsLinkName });
      await expect(drawerNewsLink).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/\/news$/);
      await expect(page.getByRole("heading", { level: 1, name: "News from Epe." })).toBeVisible();
      await expect(drawer).toBeHidden();
      await expect(menuButton).toBeFocused();
      await expect(page.locator('.drawer-nav a[href="/news"]')).toHaveAttribute("aria-current", "page");
    } else {
      const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
      const newsLink = mainNavigation.getByRole("link", { name: newsLinkName });
      const target = await newsLink.isVisible() ? newsLink : page.getByRole("link", { name: "Read latest news", exact: true });
      await tabUntilFocused(page, target);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/news$/);
      await expect(page.getByRole("heading", { level: 1, name: "News from Epe." })).toBeVisible();
      if (await newsLink.isVisible()) await expect(newsLink).toHaveAttribute("aria-current", "page");
    }

    await expectNoHorizontalOverflow(page, `keyboard-navigated News at ${width}px`);
  });
}

for (const width of [320, 375, 768] as const) {
  test(`public mobile routes do not render dashboard bottom tabs at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "empty");
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/news", "/tourism"]) {
      await page.goto(route);
      await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
    }
  });
}

test("desktop grouped navigation is keyboard-operable and Escape restores focus", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/news");

  const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
  const discoverButton = mainNavigation.locator("summary").filter({ hasText: "Discover" });
  await discoverButton.focus();
  await expect(discoverButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(mainNavigation.getByRole("link", { name: "Tourism", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mainNavigation.getByRole("link", { name: "Tourism", exact: true })).toBeHidden();
  await expect(discoverButton).toBeFocused();
});

test("reduced-motion preference is honored by the public shell", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const motion = await page.evaluate(() => {
    const header = document.querySelector(".site-head");
    if (!header) throw new Error("Public shell header is missing");
    const headerStyle = getComputedStyle(header);
    return {
      preference: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      transitionDuration: headerStyle.transitionDuration,
      animationDuration: headerStyle.animationDuration,
    };
  });

  expect(motion.preference).toBe(true);
  expect(motion.scrollBehavior).toBe("auto");
  expect(maxCssDurationMilliseconds(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
  expect(maxCssDurationMilliseconds(motion.animationDuration)).toBeLessThanOrEqual(0.01);
});

test("radio reminder bell explains its limits and supports opt-in and opt-out", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.goto("/");
  await page.getByLabel("Radio notification settings").click();
  await expect(page).toHaveURL(/\/radio\/reminders$/);
  await expect(page.getByText(/Works only while this site is open/)).toBeVisible();
  await page.getByRole("button", { name: "Enable alert" }).click();
  await expect(page.getByRole("button", { name: "Disable alert" })).toBeVisible();
  await page.getByRole("button", { name: "Disable alert" }).click();
  await expect(page.getByRole("button", { name: "Enable alert" })).toBeVisible();
});
