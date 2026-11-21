import { expect, test } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`news navigation and category tabs at ${width}px`, async ({ page, request }) => {
    await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "stories" } });
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const news = page.getByRole("link", { name: "Read latest news", exact: true });
    await news.click();
    await expect(page).toHaveURL(/\/news$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);

    const category = page.getByRole("navigation", { name: "News categories", exact: true });
    const allNews = category.getByRole("link", { name: "All news", exact: true });
    const sports = category.getByRole("link", { name: "Sports", exact: true });
    await expect(sports).toBeVisible();
    await expect(allNews).toHaveAttribute("aria-current", "page");

    await sports.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/category=sports/);
    await expect(sports).toHaveAttribute("aria-current", "page");
    await expect(allNews).not.toHaveAttribute("aria-current", "page");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.goBack();
    await expect(page).toHaveURL(/\/news$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    await page.goForward();
    await expect(page).toHaveURL(/category=sports/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}

test("direct news entry and query filters retain their selected search", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "stories" } });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/news?q=story");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  const category = page.getByRole("navigation", { name: "News categories", exact: true });
  await category.getByRole("link", { name: "Sports", exact: true }).click();
  await expect(page).toHaveURL(/q=story.*category=sports/);
  await expect(category.getByRole("link", { name: "Sports", exact: true })).toHaveAttribute("aria-current", "page");
});

test("breaking banner includes an older active story beyond the first page, but not an expired one", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "news-many-breaking" } });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/news");
  const breaking = page.getByRole("region", { name: "Breaking news" });
  await expect(breaking.getByRole("link", { name: "Test story 34" })).toBeVisible();
  await expect(breaking.getByRole("link", { name: "Test story 35" })).toHaveCount(0);
  await page.goto("/news?category=local-news");
  await expect(page.getByRole("region", { name: "Breaking news" })).toHaveCount(0);
});

test("homepage breaking ticker includes an older active story but not an expired one", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "news-many-breaking" } });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const breaking = page.getByRole("region", { name: "Breaking news" });
  await expect(breaking.getByRole("link", { name: "Test story 34" })).toBeVisible();
  await expect(breaking.getByRole("link", { name: "Test story 35" })).toHaveCount(0);
  await expect(page.locator(".home-story-card").first()).toBeVisible();
});

test("homepage does not duplicate a breaking story that is also among latest stories", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "stories" } });
  await page.goto("/");
  const cards = page.locator(".home-story-card");
  await expect(cards.first().getByRole("heading", { name: "Smoke fixture: breaking headline" })).toBeVisible();
  await expect(cards.getByRole("heading", { name: "Smoke fixture: breaking headline" })).toHaveCount(1);
  await expect(cards.first().getByText("Breaking", { exact: true })).toBeVisible();
});
