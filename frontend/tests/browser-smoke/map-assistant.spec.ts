import { expect, test } from "@playwright/test";

test("the latest map reply stays above the composer when its notice wraps", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    localStorage.setItem("epelawa_cookie_consent", "true");
    localStorage.setItem("epelawa-push-onboarding", "dismissed");
  });
  const reply = "Here is the route to your destination. Confirm the route before travelling.";
  await page.route("**/api/map/assistant", (route) =>
    route.fulfill({ json: { reply: { answer: reply, places: [] } } }),
  );
  await page.goto("/map");

  const input = page.getByRole("textbox", { name: "Ask about directions or a place in Epe Division" });
  for (let turn = 1; turn <= 4; turn++) {
    await input.fill(`Can you give me directions to my destination? Question ${turn}`);
    await input.press("Enter");
    await expect(page.getByText(reply, { exact: true })).toHaveCount(turn);
  }

  const notice = page.getByText("Voice input is not available yet. Please type your question instead.", { exact: true });
  await page.getByRole("button", { name: "Voice input is not available yet; use typing instead" }).click();
  await expect(notice).toBeVisible();
  const assistant = page.getByRole("region", { name: "How can I help you today?" });
  const latest = assistant.getByRole("listitem").last();
  await expect(latest).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => {
    const [replyBox, noticeBox] = await Promise.all([latest.boundingBox(), notice.boundingBox()]);
    return replyBox && noticeBox ? noticeBox.y - replyBox.y - replyBox.height : -1;
  }).toBeGreaterThan(0);
  await expect(input).toBeFocused();
});
