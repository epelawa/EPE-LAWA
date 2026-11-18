import { expect, test } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`news navigation and category disclosure at ${width}px`, async ({ page, request }) => {
    await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "stories" } });
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const news = page.getByRole("link", { name: "Read latest news", exact: true });
    await news.click();
    await expect(page).toHaveURL(/\/news$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);

    const category = page.getByRole("navigation", { name: "News categories", exact: true });
    const disclosure = category.locator("details");
    const summary = disclosure.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(disclosure).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(disclosure).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
    await summary.click();
    await page.locator("h1").click();
    await expect(disclosure).not.toHaveAttribute("open", "");

    await summary.click();
    await category.getByRole("link", { name: "Sports", exact: true }).click();
    await expect(page).toHaveURL(/category=sports/);
    await expect(disclosure).not.toHaveAttribute("open", "");
    await expect(summary).toContainText("Sports");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    await summary.click();
    await category.getByRole("link", { name: "Sports", exact: true }).click();
    await expect(disclosure).not.toHaveAttribute("open", "");
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
  await category.locator("summary").click();
  await category.getByRole("link", { name: "Sports", exact: true }).click();
  await expect(page).toHaveURL(/q=story.*category=sports/);
  await expect(category.locator("summary")).toContainText("Sports");
  await expect(category.locator("details")).not.toHaveAttribute("open", "");
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

test("homepage leads with an older active breaking story without duplicating it", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "news-many-breaking" } });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const lead = page.locator(".home-story-card").first();
  await expect(lead.getByRole("heading", { name: "Test story 34" })).toBeVisible();
  await expect(lead.getByText("Breaking", { exact: true })).toBeVisible();
  await expect(lead.getByRole("link", { name: "Test story 34", exact: true })).toHaveAttribute("href", "/news/test-story-34");
  await expect(page.locator(".home-story-card").getByRole("heading", { name: "Test story 34" })).toHaveCount(1);
  await expect(page.locator(".home-story-card").getByRole("heading", { name: "Test story 35" })).toHaveCount(0);
});

test("homepage does not duplicate a breaking story that is also among latest stories", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "stories" } });
  await page.goto("/");
  const cards = page.locator(".home-story-card");
  await expect(cards.first().getByRole("heading", { name: "Smoke fixture: breaking headline" })).toBeVisible();
  await expect(cards.getByRole("heading", { name: "Smoke fixture: breaking headline" })).toHaveCount(1);
  await expect(cards.first().getByText("Breaking", { exact: true })).toBeVisible();
});
