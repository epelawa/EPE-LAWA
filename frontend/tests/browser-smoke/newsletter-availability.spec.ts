import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const footerCardSelector = 'section[aria-labelledby="newsletter-footer-heading"]';

async function setFixtureMode(request: APIRequestContext, mode: "empty") {
  const response = await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function expectNoNewsletterSubmission(page: Page) {
  const main = page.locator("main");
  await expect(main.locator("form")).toHaveCount(0);
  await expect(main.locator('input[type="email"]')).toHaveCount(0);
}

test("newsletter status routes stay unavailable and do not collect or claim success", async ({ page, request }) => {
  await setFixtureMode(request, "empty");

  await page.goto("/newsletter");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 1, name: "Newsletter sign-up is unavailable." })).toBeVisible();
  await expect(main.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(main.getByRole("heading", { level: 2, name: "This page does not accept email addresses." })).toBeVisible();
  await expect(main.getByText(/no signup is created here/i)).toBeVisible();
  await expect(main.getByText(/this page collects or sends nothing/i)).toBeVisible();
  await expect(main.getByText(/you are subscribed|subscription successful/i)).toHaveCount(0);
  await expectNoNewsletterSubmission(page);
  await expect(main.getByRole("link", { name: "Unsubscribe availability" })).toHaveAttribute("href", "/newsletter/unsubscribe");

  await main.getByRole("link", { name: "Unsubscribe availability" }).click();
  await expect(page).toHaveURL(/\/newsletter\/unsubscribe$/);
  const unsubscribeMain = page.locator("main");
  await expect(unsubscribeMain.getByRole("heading", { level: 1, name: "Newsletter unsubscribe is unavailable." })).toBeVisible();
  await expect(unsubscribeMain.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(unsubscribeMain.getByRole("heading", { level: 2, name: "This page cannot change a subscription." })).toBeVisible();
  await expect(unsubscribeMain.getByText(/no unsubscribe request is submitted or stored here/i)).toBeVisible();
  await expect(unsubscribeMain.getByText(/you have been unsubscribed|preferences have been updated/i)).toHaveCount(0);
  await expectNoNewsletterSubmission(page);
  await expect(unsubscribeMain.getByRole("link", { name: "Sign-up availability" })).toHaveAttribute("href", "/newsletter");
});

test("shared newsletter footer card renders on the homepage and News with unavailable links", async ({ page, request }) => {
  await setFixtureMode(request, "empty");

  for (const route of ["/", "/news"] as const) {
    await page.goto(route);
    const card = page.locator(footerCardSelector);
    await expect(card, `newsletter footer card should render at ${route}`).toHaveCount(1);
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { level: 2, name: "EPE LAWA Newsletter" })).toBeVisible();
    await expect(card.getByText("Unavailable", { exact: true })).toBeVisible();
    await expect(card.getByText(/no email address is collected here/i)).toBeVisible();
    await expect(card.getByRole("link", { name: "Sign-up unavailable" })).toHaveAttribute("href", "/newsletter");
    await expect(card.getByRole("link", { name: "Unsubscribe unavailable" })).toHaveAttribute("href", "/newsletter/unsubscribe");
  }
});
