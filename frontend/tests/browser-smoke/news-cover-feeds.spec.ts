import { expect, test } from "@playwright/test";

const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const app = new URL(process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100").origin;
const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "browser-smoke@example.invalid", email_confirmed_at: "2026-01-01T00:00:00.000Z", user_metadata: { display_name: "Aderonke Smoke" }, app_metadata: { provider: "email", providers: ["email"] } };
const session = { access_token: "browser-smoke-access-token", refresh_token: "browser-smoke-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`homepage and member feeds use linked covers and logo fallback at ${width}px`, async ({ page, request }) => {
    await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "news-many" } });
    await page.setViewportSize({ width, height: 800 });
    await page.route("https://images.example.com/test-cover.jpg", route => route.fulfill({ path: "frontend/apps/main/public/brand-logo.webp", contentType: "image/png" }));
    await page.goto("/");
    const firstHome = page.locator(".home-story-card").first().locator("img");
    await expect(firstHome).toHaveAttribute("src", "https://images.example.com/test-cover.jpg");
    await expect(page.locator(".home-story-card").nth(1).locator("img")).toHaveAttribute("data-news-fallback", "true");
    await expect(page.locator(".home-story-card").first().getByText("Illustrative image.")).toHaveCount(0);
    await page.context().addCookies([{ name: "sb-localhost-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: app, httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/dashboard?tab=discover");
    const story = page.getByRole("link", { name: "Read: Test story 1", exact: true });
    await expect(story.locator("img")).toHaveAttribute("src", "https://images.example.com/test-cover.jpg");
    await expect(page.getByRole("link", { name: "Read: Test story 2", exact: true }).locator("img")).toHaveAttribute("data-news-fallback", "true");
    const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  });
}

test("a broken linked image is replaced with the site logo", async ({ page, request }) => {
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "news-many" } });
  await page.route("https://images.example.com/test-cover.jpg", route => route.abort());
  await page.context().addCookies([{ name: "sb-localhost-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: app, httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/dashboard?tab=discover");
  const image = page.getByRole("link", { name: "Read: Test story 1", exact: true }).locator("img");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("data-news-fallback", "true");
  await expect(image).toHaveAttribute("src", "/brand-logo.webp");
});
