import { expect, test } from "@playwright/test";

test("unpublished or unknown detail URLs return an HTTP 404", async ({ page, request }) => {
  const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
  expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } })).ok()).toBe(true);
  test.setTimeout(120_000);
  for (const path of [
    "/business-directory/no-such-business",
    "/news/no-such-story",
    "/tourism/no-such-destination",
    "/who-is-who/no-such-person",
    "/forum/category/no-such-category",
    "/forum/thread/no-such-thread",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found." }), path).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first(), path).toBeAttached();
  }
});
