import { expect, test, type Page } from "@playwright/test";

// Turn 5 redesign brief: Business Directory + Business Profile. Synthetic fixture listings only
// ("directory" mode of supabase-stub.mjs); no production data is read.
const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;

async function quietStart(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("epelawa_cookie_consent", "true"); localStorage.setItem("epelawa-push-onboarding", "dismissed"); } catch { /* storage blocked */ }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}
const noOverflow = async (page: Page, label: string) => {
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(size.document, label).toBeLessThanOrEqual(size.viewport);
};

test.afterEach(async ({ request }) => { await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } }); });

test("empty directory is honest and keeps the submission route", async ({ page, request }) => {
  test.setTimeout(120_000);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } });
  await quietStart(page);
  await page.goto("/business-directory");
  await expect(page.getByRole("heading", { name: "Discover Local Businesses", level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder("Search businesses, services or locations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No businesses are published yet" })).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "List your business" }).first()).toHaveAttribute("href", "/business-directory/submit");
});

test("search, category, verified filter, sorting and pagination keep each other's state", async ({ page, request }) => {
  test.setTimeout(180_000);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "directory" } });
  await quietStart(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/business-directory");
  await expect(page.getByRole("heading", { name: "Featured businesses" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "15 businesses" })).toBeVisible();
  const results = page.locator("section[aria-labelledby='directory-results'] article");
  await expect(results).toHaveCount(12);
  // Pagination preserves state and never repeats a card.
  const firstPage = await results.locator("h3").allTextContents();
  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(results).toHaveCount(3);
  const secondPage = await results.locator("h3").allTextContents();
  expect(secondPage.filter((name) => firstPage.includes(name))).toEqual([]);
  // Category chip.
  await page.getByRole("navigation", { name: "Business categories" }).getByRole("link", { name: "Trades" }).click();
  await expect(page).toHaveURL(/category=trades/);
  await expect(page.getByRole("navigation", { name: "Business categories" }).getByRole("link", { name: "Trades" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Trades");
  // Search keeps the category.
  await page.getByPlaceholder("Search businesses, services or locations").fill("Fixture Business 3");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Fixture\+Business\+3/);
  await expect(page).toHaveURL(/category=trades/);
  // Filters sheet: verified only.
  await page.getByRole("navigation", { name: "Business categories" }).getByRole("link", { name: "All" }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filter businesses" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Verified businesses only/).check();
  await dialog.getByRole("button", { name: "Show results" }).click();
  await expect(page).toHaveURL(/verified=1/);
  await expect(page).not.toHaveURL(/area=/);
  for (const badge of await results.all()) await expect(badge).toContainText("Verified");
  // Sorting (wait until the select navigates on its own; before hydration the Apply button covers it).
  await expect(page.locator("form[data-ready]").filter({ has: page.getByLabel("Sort by") })).toBeAttached();
  await page.getByLabel("Sort by").selectOption("newest");
  await expect(page).toHaveURL(/sort=newest/);
  await expect(page).toHaveURL(/verified=1/);
  // Clearing.
  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/business-directory$/);
  // A search with no match.
  await page.getByPlaceholder("Search businesses, services or locations").fill("zzzz-no-such-business");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "No businesses found" })).toBeVisible();
  await expect(page.getByText("Try a different search term or remove some filters.")).toBeVisible();
});

test("profile shows real contact actions, information, claim and report, with no dead buttons", async ({ page, request }) => {
  test.setTimeout(150_000);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "directory" } });
  await quietStart(page);
  await page.goto("/business-directory/fixture-business-1");
  await expect(page.getByRole("heading", { name: "Fixture Business 1", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Businesses");
  await expect(page.getByText("Verified business")).toBeVisible();
  const wa = page.getByRole("link", { name: /Chat on WhatsApp/ });
  await expect(wa).toHaveAttribute("href", "https://wa.me/2348000000000");
  await expect(wa).toHaveAttribute("rel", /noopener/);
  await expect(page.getByRole("link", { name: /Call business/ })).toHaveAttribute("href", "tel:+2348000000000");
  await expect(page.getByRole("link", { name: /Visit website/ })).toHaveAttribute("href", "https://example.invalid/");
  await expect(page.getByRole("link", { name: /Get directions/ })).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\//);
  await expect(page.getByRole("heading", { name: "Contact and location" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in to claim it/ })).toHaveAttribute("href", /\/login\?next=/);
  await expect(page.getByRole("link", { name: "Report through support" })).toHaveAttribute("href", "/support");
  const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? "{}");
  expect(jsonLd["@type"]).toBe("LocalBusiness");
  expect(jsonLd.aggregateRating).toBeUndefined();
  expect(jsonLd.openingHours).toBeUndefined();

  // A listing without contact data renders no contact buttons.
  await page.goto("/business-directory/fixture-business-2");
  await expect(page.getByRole("link", { name: /Chat on WhatsApp|Call business|Visit website/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Contact and location" })).toBeVisible();
  // Claim confirmation after the claim action redirects back.
  await page.goto("/business-directory/fixture-business-2?claim=sent");
  await expect(page.getByRole("status").filter({ hasText: "Your claim was sent to the team" })).toBeVisible();
  const missing = await page.goto("/business-directory/no-such-business");
  expect(missing?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.getByRole("heading", { level: 1, name: "Page not found." })).toBeVisible();
});

test("directory and profile fit every owner viewport without horizontal overflow", async ({ page, request }) => {
  test.setTimeout(300_000);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "directory" } });
  await quietStart(page);
  const widths: Array<[number, number]> = [[320, 640], [360, 780], [375, 812], [390, 844], [412, 915], [430, 932], [600, 960], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
  for (const route of ["/business-directory", "/business-directory/fixture-business-3", "/business-directory/fixture-business-1"]) {
    await page.goto(route);
    for (const [width, height] of widths) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(60);
      await noOverflow(page, `${route} at ${width}px`);
    }
  }
  // The filter sheet fits a 320px phone.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/business-directory");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const box = await page.getByRole("dialog", { name: "Filter businesses" }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
});
