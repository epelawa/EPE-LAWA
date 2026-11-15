import { expect, test, type Page } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const appOrigin = new URL(process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100").origin;
const authCookieName = "sb-localhost-auth-token";
const fixtureAccessToken = "browser-smoke-access-token";
const fixtureSession = {
  access_token: fixtureAccessToken,
  refresh_token: "browser-smoke-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "browser-smoke@example.invalid",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    user_metadata: { display_name: "Aderonke Smoke" },
    app_metadata: { provider: "email", providers: ["email"] },
  },
};

async function signIn(page: Page) {
  await page.context().addCookies([{
    name: authCookieName,
    value: `base64-${Buffer.from(JSON.stringify(fixtureSession)).toString("base64url")}`,
    url: appOrigin,
    httpOnly: true,
    sameSite: "Lax",
  }]);
}

async function expectActiveTab(page: Page, name: string) {
  const tabs = page.getByRole("navigation", { name: "Member dashboard" });
  await expect(tabs.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  await expect(tabs.locator('a[aria-current="page"]')).toHaveCount(1);
}

async function expectLocalSupabaseOnly(page: Page) {
  const requests = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  for (const requestURL of requests.filter((value) => value.includes("/auth/v1/") || value.includes("/rest/v1/"))) {
    expect(new URL(requestURL).origin, `Supabase request must use the local fixture: ${requestURL}`).toBe(fixtureURL);
  }
}

test("signed-in dashboard tabs and public shell remain honest and local", async ({ page }) => {
  test.setTimeout(60_000);
  await page.route("**/*", async (route) => {
    const requestURL = new URL(route.request().url());
    if (requestURL.origin !== appOrigin && requestURL.origin !== fixtureURL) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await signIn(page);
  await page.goto("/dashboard?tab=home");

  await expect(page).toHaveURL(/\/dashboard\?tab=home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome, Aderonke Smoke." })).toBeVisible();
  await expectActiveTab(page, "Home");
  await expect(page.getByRole("heading", { name: "Your community spaces" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit the community forum" })).toHaveAttribute("href", "/forum");
  await expect(page.getByRole("link", { name: "Explore Epe history" })).toHaveAttribute("href", "/itan-ilu-mi");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=discover$/);
  await expectActiveTab(page, "Discover");
  await expect(page.getByRole("heading", { name: "Explore Epe on EPE LAWA" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Historical sites and tourism" })).toHaveAttribute("href", "/tourism");
  await expect(page.getByRole("link", { name: "Map and navigation" })).toHaveAttribute("href", "/map");
  await expect(page.getByRole("link", { name: "Business directory and marketplace" })).toHaveAttribute("href", "/business-directory");
  await expect(page.getByRole("link", { name: "EPE LAWA Radio" })).toHaveAttribute("href", "/radio");

  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=saved$/);
  await expectActiveTab(page, "Saved");
  await expect(page.getByRole("heading", { name: "Saving isn’t available yet" })).toBeVisible();
  await expect(page.getByText("no saved records are being queried or reported here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Discover Epe" })).toHaveAttribute("href", "/dashboard?tab=discover");

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=profile$/);
  await expectActiveTab(page, "Profile");
  await expect(page.getByRole("heading", { name: "Public profile" })).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveValue("Aderonke Smoke");
  await expect(page.getByLabel("Handle")).toHaveValue("aderonke_smoke");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeVisible();

  await page.goto("/dashboard?tab=not-a-real-tab");
  await expect(page).toHaveURL(/\/dashboard\?tab=not-a-real-tab$/);
  await expectActiveTab(page, "Home");
  await expect(page.getByRole("heading", { name: "Your community spaces" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Epe\.\s*Closer to home\./i })).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
  await expectLocalSupabaseOnly(page);

  await page.goto("/dashboard?tab=home");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
