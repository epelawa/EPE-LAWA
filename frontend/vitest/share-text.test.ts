import { describe, expect, it } from "vitest";
import { buildShareText, shareExcerpt, shareHashtags } from "../apps/main/lib/share-text";

describe("story share text", () => {
  it("always carries the hashtags readers see under the story, plus #EpeLawa", () => {
    expect(shareHashtags([{ slug: "black-friday", label: "Black Friday" }, { label: "#Lagos" }, { label: "lagos" }])).toEqual(["#BlackFriday", "#Lagos", "#EpeLawa"]);
    expect(shareHashtags(null)).toEqual(["#EpeLawa"]);
  });

  it("adds a little of the news, cut at a word", () => {
    const long = "Samsung and SIMS Nigeria are offering up to 80 percent off authentic products for two days ".repeat(4);
    const excerpt = shareExcerpt(null, { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: long }] }] }, 120);
    expect(excerpt.length).toBeLessThanOrEqual(121);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(shareExcerpt("Short summary.", null)).toBe("Short summary.");
  });

  it("puts headline, excerpt, author and hashtags in order", () => {
    const text = buildShareText({ title: "Two-day sale", summary: "Up to 80 percent off.", author: "Epe-Lawa Editorial Desk", tags: [{ label: "Business" }] });
    expect(text).toBe("Two-day sale\n\nUp to 80 percent off.\n\nBy Epe-Lawa Editorial Desk · EPE LAWA\n#Business #EpeLawa");
  });
});
