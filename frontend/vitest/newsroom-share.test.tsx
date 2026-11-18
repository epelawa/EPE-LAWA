// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { NEWS_HASHTAGS, suggestNewsHashtags } from "../apps/admin/lib/news-hashtags";
import NewsShareTools from "../apps/admin/components/news-share-tools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("provides 50 curated hashtags and suggests only whole matching terms", () => {
  expect(NEWS_HASHTAGS).toHaveLength(50);
  expect(new Set(NEWS_HASHTAGS.map(({ tag }) => tag)).size).toBe(50);
  expect(suggestNewsHashtags("Epe schools and health")).toEqual(expect.arrayContaining(["EpeNews", "Schools", "Health"]));
  expect(suggestNewsHashtags("marketer")).not.toContain("Markets");
  expect(suggestNewsHashtags("" )).toEqual([]);
});

it("copies a caption and public link with selected hashtags", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  act(() => root.render(<NewsShareTools title="Epe schools" summary="Community update" url="https://example.test/news/story" />));
  expect(container.textContent).toContain("Apps choose whether to display");
  const buttons = [...container.querySelectorAll("button")];
  await act(async () => { buttons.find((button) => button.textContent === "Copy caption and link")!.click(); });
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("https://example.test/news/story"));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#Schools"));
  expect(container.textContent).toContain("Caption and public link copied.");
  act(() => root.unmount()); container.remove();
});
