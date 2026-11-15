import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

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

type FixtureMode = "empty" | "error" | "stories";

async function setFixtureMode(request: APIRequestContext, mode: FixtureMode) {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function signIn(page: Page) {
  await page.context().addCookies([{
    name: authCookieName,
    value: `base64-${Buffer.from(JSON.stringify(fixtureSession)).toString("base64url")}`,
    url: appOrigin,
    httpOnly: true,
    sameSite: "Lax",
  }]);
}

function dashboardNavigation(page: Page) {
  return (page.viewportSize()?.width ?? 1280) <= 767
    ? page.getByRole("navigation", { name: "Mobile primary navigation" })
    : page.getByRole("navigation", { name: "Member dashboard" });
}

async function expectActiveTab(page: Page, name: string) {
  const tabs = dashboardNavigation(page);
  await expect(tabs.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  await expect(tabs.locator('a[aria-current="page"]')).toHaveCount(1);
}

async function expectLocalSupabaseOnly(page: Page) {
  const requests = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  for (const requestURL of requests.filter((value) => value.includes("/auth/v1/") || value.includes("/rest/v1/"))) {
    expect(new URL(requestURL).origin, `Supabase request must use the local fixture: ${requestURL}`).toBe(fixtureURL);
  }
}

async function limitToLocalOrigins(page: Page) {
  await page.route("**/*", async (route) => {
    const requestURL = new URL(route.request().url());
    if (requestURL.origin !== appOrigin && requestURL.origin !== fixtureURL) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

test("signed-in dashboard keeps honest empty views and one responsive tab bar", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  await setFixtureMode(request, "empty");
  await page.setViewportSize({ width: 1280, height: 900 });
  await limitToLocalOrigins(page);
  await signIn(page);
  await page.goto("/dashboard?tab=home");

  await expect(page).toHaveURL(/\/dashboard\?tab=home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Breaking News" })).toBeVisible();
  await expectActiveTab(page, "Home");
  await expect(page.getByRole("heading", { name: "Breaking News" })).toBeVisible();
  await expect(page.getByText("There are no active breaking stories right now.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible();
  await expect(page.getByText("No other recent published stories are available to recommend yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await dashboardNavigation(page).getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=discover$/);
  await expectActiveTab(page, "Discover");
  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  await expect(page.getByText("No stories published yet")).toBeVisible();
  await page.getByLabel("Search headlines").fill("nonexistent fixture title");
  await page.getByRole("button", { name: "Search stories" }).click();
  await expect(page).toHaveURL(/tab=discover&q=nonexistent\+fixture\+title/);
  await expect(page.getByRole("heading", { name: "No matching published stories" })).toBeVisible();

  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=saved$/);
  await expectActiveTab(page, "Saved");
  await expect(page.getByRole("heading", { name: "Saving isn’t available yet" })).toBeVisible();
  await expect(page.getByText("no saved records are being queried or reported here.")).toBeVisible();

  await dashboardNavigation(page).getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=profile$/);
  await expectActiveTab(page, "Profile");
  await expect(page.getByRole("heading", { name: "Public profile" })).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveValue("Aderonke Smoke");
  await expect(page.getByLabel("Handle")).toHaveValue("aderonke_smoke");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeVisible();

  await page.goto("/dashboard?tab=not-a-real-tab");
  await expect(page).toHaveURL(/\/dashboard\?tab=not-a-real-tab$/);
  await expectActiveTab(page, "Home");
  await expect(page.getByRole("heading", { name: "Breaking News" })).toBeVisible();
  await expect(page.locator(".site-preloader")).toHaveCount(0);

  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  for (const [width, height] of [[320, 800], [375, 900], [768, 900], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const mobile = width <= 767;
    const topTabs = page.getByRole("navigation", { name: "Member dashboard" });
    const bottomTabs = page.getByRole("navigation", { name: "Mobile primary navigation" });
    if (mobile) {
      await expect(topTabs).toBeHidden();
      await expect(bottomTabs).toBeVisible();
      await expect(bottomTabs.getByRole("link", { name: "Home", exact: true })).toHaveCount(1);
    } else {
      await expect(topTabs).toBeVisible();
      await expect(bottomTabs).toBeHidden();
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `dashboard should not overflow at ${width}px`).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
  }

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Epe Closer To Home" })).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
  await expectLocalSupabaseOnly(page);

  await page.goto("/dashboard?tab=home");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("signed-in Home and Discover render and filter only published story records", async ({ page, request }) => {
  test.setTimeout(60_000);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
  });
  await setFixtureMode(request, "stories");
  await page.setViewportSize({ width: 1024, height: 900 });
  await limitToLocalOrigins(page);
  await signIn(page);
  await page.goto("/dashboard?tab=home");

  await expect(page.getByRole("link", { name: "Read breaking story: Smoke fixture: breaking headline" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: market story" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: sports story" })).toBeVisible();
  const missingMetadata = page.getByRole("link", { name: "Read: Smoke fixture: sports story" });
  await expect(missingMetadata.getByText("Byline unavailable")).toBeVisible();
  await expect(missingMetadata.getByText("News", { exact: true })).toBeVisible();
  await expect(missingMetadata.locator("img")).toHaveCount(0);
  await expect(page.locator("#recommendations-heading").locator("..")
    .getByText("Smoke fixture: breaking headline")).toHaveCount(0);

  await dashboardNavigation(page).getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: market story" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: sports story" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Local News", exact: true }).first()).toBeVisible();

  await page.getByLabel("Search headlines").fill("market");
  await page.getByLabel("Category").selectOption("local-news");
  await page.getByRole("button", { name: "Search stories" }).click();
  await expect(page).toHaveURL(/\/dashboard\?tab=discover&q=market&category=local-news$/);
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: market story" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read: Smoke fixture: sports story" })).toHaveCount(0);
  await expect(page.getByText(/Showing 1 published story matching “market” on this page\./)).toBeVisible();
  await expectLocalSupabaseOnly(page);
  expect(hydrationErrors).toEqual([]);
});

test("story query failures stay distinct from empty results on both dashboard feeds", async ({ page, request }) => {
  await setFixtureMode(request, "error");
  await page.setViewportSize({ width: 1024, height: 900 });
  await limitToLocalOrigins(page);
  await signIn(page);
  await page.goto("/dashboard?tab=home");
  await expect(page.getByRole("alert").filter({ hasText: "Breaking news is unavailable" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Recommendations could not be loaded" })).toBeVisible();
  await expect(page.getByText("There are no active breaking stories right now.")).toHaveCount(0);

  await dashboardNavigation(page).getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Discover stories could not be loaded" })).toBeVisible();
  await expect(page.getByText(/Story filters are temporarily unavailable/)).toBeVisible();
  await expect(page.getByText("No stories published yet")).toHaveCount(0);
  await expectLocalSupabaseOnly(page);
});
