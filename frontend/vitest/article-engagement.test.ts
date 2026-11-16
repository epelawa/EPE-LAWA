import { describe, expect, it } from "vitest";
import { loadArticleEngagement } from "../apps/main/lib/article-engagement";

function client(data: unknown, error: unknown = null) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) }) } as unknown as Parameters<typeof loadArticleEngagement>[0];
}
describe("article engagement", () => {
  it("preserves verified zeroes and numeric counts", async () => {
    expect(await loadArticleEngagement(client({ view_count: "0", comment_count: 3 }), "article")).toEqual({ views: 0, comments: 3 });
  });
  it("does not turn missing or malformed data into a fabricated zero", async () => {
    for (const data of [{ view_count: null, comment_count: 0 }, { view_count: "bad", comment_count: 0 }, { view_count: -1, comment_count: 0 }, null]) {
      expect(await loadArticleEngagement(client(data), "article")).toBeNull();
    }
  });
});
