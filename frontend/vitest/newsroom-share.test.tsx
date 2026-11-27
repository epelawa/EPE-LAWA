// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { NEWS_HASHTAGS, suggestNewsHashtags } from "../apps/admin/lib/news-hashtags";
import NewsShareTools from "../apps/admin/components/news-share-tools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("provides 150 curated hashtags and suggests only whole matching terms", () => {
  expect(NEWS_HASHTAGS).toHaveLength(150);
  expect(new Set(NEWS_HASHTAGS.map(({ tag }) => tag.toLowerCase())).size).toBe(150);
  expect(suggestNewsHashtags("International news covers climate change, the presidency, tech, an election campaign and palliatives.")).toEqual(expect.arrayContaining(["InternationalNews", "ClimateChange", "Presidency", "TechNews", "ElectionCampaign", "Palliatives"]));
  expect(suggestNewsHashtags("Epe schools and health")).toEqual(expect.arrayContaining(["EpeNews", "Schools", "Health"]));
  expect(suggestNewsHashtags("marketer")).not.toContain("Markets");
  expect(suggestNewsHashtags("" )).toEqual([]);
});

it("copies a caption and public link with selected hashtags", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  act(() => root.render(<NewsShareTools title="Epe schools" summary="Community update" url="https://example.test/news/story" imageUrl={null} />));
  expect(container.textContent).toContain("When supported, the cover is attached");
  const buttons = [...container.querySelectorAll("button")];
  await act(async () => { buttons.find((button) => button.textContent === "Copy caption and link")!.click(); });
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("https://example.test/news/story"));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#Schools"));
  expect(container.textContent).toContain("Caption and public link copied.");
  act(() => root.unmount()); container.remove();
});
