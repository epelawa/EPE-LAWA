import { expect, it } from "vitest";
import { rankRecentStories } from "../apps/main/lib/recommendation-ranking";
const stories = [{ id: "newest" }, { id: "middle" }, { id: "oldest" }];
it("ranks the latest candidates by real view count, preserving recency for ties", () => {
  const views = new Map([["newest", { view_count: 2 }], ["middle", { view_count: 8 }], ["oldest", { view_count: 8 }]]);
  expect(rankRecentStories(stories, views).items.map(item => item.id)).toEqual(["middle", "oldest", "newest"]);
  expect(stories.map(item => item.id)).toEqual(["newest", "middle", "oldest"]);
  expect(rankRecentStories(stories, views).ranked).toBe(true);
});
it("keeps newest order and does not claim popularity when any count is missing or invalid", () => {
  for (const views of [new Map([["newest", { view_count: 200 }]]), new Map([["newest", { view_count: 0 }], ["middle", { view_count: NaN }], ["oldest", { view_count: 2 }]])]) {
    expect(rankRecentStories(stories, views)).toEqual({ items: stories, ranked: false });
  }
  expect(rankRecentStories([], new Map())).toEqual({ items: [], ranked: false });
});
it("allows real zero counts and limits the number of recommendations", () => {
  const views = new Map(stories.map(item => [item.id, { view_count: 0 }]));
  expect(rankRecentStories(stories, views, 2)).toEqual({ items: stories.slice(0, 2), ranked: true });
});
