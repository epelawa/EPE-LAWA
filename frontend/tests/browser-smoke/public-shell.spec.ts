import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const viewportWidths = [320, 375, 600, 767, 768, 800, 960, 1024, 1440] as const;
const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const smokeBaseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";
const noResultsQuery = "browser-smoke-no-results";
const mainNavigationName = "Primary navigation";
const mobileNavigationName = "Mobile primary navigation";
const openMenuName = "Open navigation menu";
const closeMenuName = "Close navigation menu";
const newsLinkName = /News/;

async function setFixtureMode(request: APIRequestContext, mode: "empty" | "error") {
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
    await expect(page.getByRole("heading", { level: 1, name: /Epe\.\s*Closer to home\./i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "News from Epe" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "No stories published yet" })).toBeVisible();
    await captureEvidence(page, "home", width);
    await expectNoHorizontalOverflow(page, `homepage at ${width}px`);

    const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
    const newsLink = mainNavigation.getByRole("link", { name: newsLinkName });
    if (await newsLink.isVisible()) {
      await newsLink.click();
      await expect(newsLink).toHaveAttribute("aria-current", "page");
    } else {
      await page.getByRole("link", { name: "Explore Epe", exact: true }).click();
    }

    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole("heading", { level: 1, name: "Latest News" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No stories published yet" })).toBeVisible();
    await captureEvidence(page, "news", width);
    await expectNoHorizontalOverflow(page, `News empty state at ${width}px`);

    const searchToggle = page.locator('summary[aria-label="Search headlines"]');
    await searchToggle.click();
    const search = page.getByRole("searchbox", { name: "Search headlines" });
    await expect(search).toBeVisible();
    await search.fill(noResultsQuery);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/news\\?q=${noResultsQuery}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Search results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No matching stories" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `News no-results state at ${width}px`);

    await setFixtureMode(request, "error");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 3, name: "The newsroom is unavailable right now" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `homepage error state at ${width}px`);
    await page.goto("/news");
    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole("heading", { level: 1, name: "News" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The newsroom did not load" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `News error state at ${width}px`);
  });
}

for (const width of [320, 375, 768, 1024] as const) {
  test(`keyboard navigation and focus behavior at ${width}px`, async ({ page, request }) => {
    await setFixtureMode(request, "empty");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();

    const menuButton = page.getByRole("button", { name: openMenuName, exact: true });
    if (await menuButton.isVisible()) {
      await tabUntilFocused(page, menuButton);
      await page.keyboard.press("Enter");

      const drawer = page.getByRole("dialog", { name: "Find your place in Epe." });
      await expect(drawer).toBeVisible();
      const closeButton = drawer.getByRole("button", { name: closeMenuName, exact: true });
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
      await expect(page.getByRole("heading", { level: 1, name: "Latest News" })).toBeVisible();
      await expect(drawer).toBeHidden();
      await expect(menuButton).toBeFocused();
      await expect(page.locator('.drawer-nav a[href="/news"]')).toHaveAttribute("aria-current", "page");
    } else {
      const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
      const newsLink = mainNavigation.getByRole("link", { name: newsLinkName });
      const target = await newsLink.isVisible() ? newsLink : page.getByRole("link", { name: "Explore Epe", exact: true });
      await tabUntilFocused(page, target);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/news$/);
      await expect(page.getByRole("heading", { level: 1, name: "Latest News" })).toBeVisible();
      if (await newsLink.isVisible()) await expect(newsLink).toHaveAttribute("aria-current", "page");
    }

    await expectNoHorizontalOverflow(page, `keyboard-navigated News at ${width}px`);
  });
}

for (const width of [320, 375] as const) {
  test(`four-tab mobile bottom navigation works without covering content at ${width}px`, async ({ browser, request }) => {
    await setFixtureMode(request, "empty");
    const context = await browser.newContext({
      baseURL: smokeBaseURL,
      viewport: { width, height: 900 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    try {
      await page.goto("/news");
      const bottomNavigation = page.getByRole("navigation", { name: mobileNavigationName, exact: true });
      await expect(bottomNavigation).toBeVisible();
      await expectNoHorizontalOverflow(page, `News bottom navigation at ${width}px`);

      const homeLink = bottomNavigation.getByRole("link", { name: "Home", exact: true });
      const newsLink = bottomNavigation.getByRole("link", { name: "News", exact: true });
      const discoverLink = bottomNavigation.getByRole("link", { name: /^(?:Discover|Explore)$/i });
      const accountLink = bottomNavigation.getByRole("link", { name: "Account", exact: true });
      await expect(bottomNavigation.getByRole("link")).toHaveCount(4);
      await expect(homeLink).toBeVisible();
      await expect(newsLink).toBeVisible();
      await expect(discoverLink).toBeVisible();
      await expect(accountLink).toBeVisible();
      await expect(bottomNavigation.getByRole("link", { name: /Forum/i })).toHaveCount(0);

      const currentLink = bottomNavigation.locator('a[aria-current="page"]');
      await expect(currentLink).toHaveCount(1);
      await expect(newsLink).toHaveAttribute("aria-current", "page");
      await expect(currentLink).toHaveAttribute("href", "/news");

      await homeLink.focus();
      await expect(homeLink).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new URL("/", smokeBaseURL).href);
      await expect(page.getByRole("navigation", { name: mobileNavigationName, exact: true })).toHaveCount(0);

      await page.goto("/news");
      await expect(newsLink).toHaveAttribute("aria-current", "page");
      const discoverHref = await discoverLink.getAttribute("href");
      if (!discoverHref?.startsWith("/")) throw new Error("Discover/Explore tab needs an internal route link");
      await discoverLink.tap();
      await expect(page).toHaveURL(new URL(discoverHref, smokeBaseURL).href);
      await expect(discoverLink).toHaveAttribute("aria-current", "page");

      await page.goto("/news");
      await expect(newsLink).toHaveAttribute("aria-current", "page");
      const lastFooterLink = page.locator("footer a").last();
      await lastFooterLink.scrollIntoViewIfNeeded();
      const navigationBox = await bottomNavigation.boundingBox();
      const contentBox = await lastFooterLink.boundingBox();
      expect(navigationBox, "mobile bottom navigation should have a visible box").not.toBeNull();
      expect(contentBox, "the final footer link should remain reachable").not.toBeNull();
      if (!navigationBox || !contentBox) throw new Error("Could not measure mobile navigation/content bounds");

      const overlaps = contentBox.left < navigationBox.right
        && contentBox.right > navigationBox.left
        && contentBox.top < navigationBox.bottom
        && contentBox.bottom > navigationBox.top;
      expect(overlaps, `bottom navigation at ${width}px should not obscure the final footer link`).toBe(false);
      const footerLinkIsHitTestable = await lastFooterLink.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const topmost = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return topmost === element || element.contains(topmost);
      });
      expect(footerLinkIsHitTestable, `footer content at ${width}px should not sit under an overlay`).toBe(true);
      await expectNoHorizontalOverflow(page, `News bottom navigation at ${width}px after touch navigation`);
    } finally {
      await context.close();
    }
  });
}

test("desktop More navigation is keyboard-operable and Escape restores focus", async ({ page, request }) => {
  await setFixtureMode(request, "empty");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/news");

  const mainNavigation = page.getByRole("navigation", { name: mainNavigationName });
  const moreButton = mainNavigation.locator(".nav-more > summary");
  await moreButton.focus();
  await expect(moreButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(mainNavigation.getByRole("link", { name: "Tourism", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mainNavigation.getByRole("link", { name: "Tourism", exact: true })).toBeHidden();
  await expect(moreButton).toBeFocused();
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
