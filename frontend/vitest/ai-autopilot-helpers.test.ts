import { describe, expect, it } from "vitest";
import { localityScore, NEWS_OUTLETS, newsworthy, parseFeed, similarity, titleTokens, trustedNewsHost, type FeedItem } from "../apps/main/lib/ai/news-sources";
import { cleanHashtags, rankCandidates, unsupportedClaims, validateDraft } from "../apps/main/lib/ai/jobs/news";
import { freeModelsFromCatalogue, parseJsonReply, shuffle } from "../apps/main/lib/ai/openrouter";
import { AI_REPLY_DISCLOSURE, scrubReply } from "../apps/main/lib/ai/jobs/enquiries";
import { adminRequestEvent, adminSection, parseUserAgent } from "../apps/main/lib/admin-activity";
import { lagosDay, lagosDayRange, lagosExact, lagosHour, lagosInputValue } from "../apps/admin/lib/lagos-time";

const punch = NEWS_OUTLETS.find((outlet) => outlet.id === "punch")!;
const bbc = NEWS_OUTLETS.find((outlet) => outlet.id === "bbc-world")!;

describe("trusted outlets", () => {
  it("accepts only listed newsrooms and their subdomains", () => {
    expect(trustedNewsHost("punchng.com")).toBe(true);
    expect(trustedNewsHost("www.bbc.co.uk")).toBe(true);
    expect(trustedNewsHost("punchng.com.evil.example")).toBe(false);
    expect(trustedNewsHost("notpunchng.com")).toBe(false);
    expect(trustedNewsHost("medium.com")).toBe(false);
  });
  it("every outlet feed is https on its own domain", () => {
    for (const outlet of NEWS_OUTLETS) {
      const host = new URL(outlet.feed).hostname;
      expect(outlet.feed.startsWith("https://")).toBe(true);
      expect(trustedNewsHost(host)).toBe(true);
    }
  });
});

describe("locality priority: Epe, then Lagos, then Nigeria, then world", () => {
  it("ranks in the owner's order", () => {
    expect(localityScore("Flooding in Epe market").label).toBe("Epe");
    expect(localityScore("Sanwo-Olu opens Ikorodu road").label).toBe("Lagos");
    expect(localityScore("Tinubu signs budget in Abuja").label).toBe("Nigeria");
    expect(localityScore("Elections in Brazil").label).toBe("World");
    expect(localityScore("Epe").score).toBeGreaterThan(localityScore("Lagos").score);
  });
  it("does not match Epe inside other words", () => {
    expect(localityScore("Pepe wins the derby").label).toBe("World");
  });
});

describe("parseFeed", () => {
  it("reads RSS items, decodes entities and drops off-site links", () => {
    const xml = `<rss><channel>
      <item><title><![CDATA[Lagos opens new Epe &amp; Ikorodu ferry route]]></title><link>https://punchng.com/lagos-ferry/</link>
        <description>&lt;p&gt;The state government said...&lt;/p&gt;</description><pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate>
        <media:content url="https://cdn.punchng.com/ferry.jpg" /></item>
      <item><title>Off-site link that must be ignored here</title><link>https://example.com/story</link></item>
      <item><title>Short</title><link>https://punchng.com/x</link></item>
    </channel></rss>`;
    const items = parseFeed(xml, punch);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Lagos opens new Epe & Ikorodu ferry route");
    expect(items[0].publishedAt).toBe("2026-11-25T10:00:00.000Z");
    expect(items[0].image).toBe("https://cdn.punchng.com/ferry.jpg");
    expect(items[0].summary).toContain("The state government said");
  });
  it("reads Atom entries with href links", () => {
    const xml = `<feed><entry><title>World leaders meet for climate summit talks</title><link href="https://www.bbc.co.uk/news/1"/><updated>2026-11-25T09:00:00Z</updated></entry></feed>`;
    expect(parseFeed(xml, bbc)[0]?.link).toBe("https://www.bbc.co.uk/news/1");
  });
});

describe("newsworthiness and de-duplication", () => {
  const item = (title: string, link = "https://punchng.com/a/", outlet = punch, hoursAgo = 1): FeedItem => ({ outlet, title, link, summary: "", publishedAt: new Date(Date.parse("2026-11-26T12:00:00Z") - hoursAgo * 3600_000).toISOString(), image: null });
  it("skips opinion, sponsored and live blogs", () => {
    expect(newsworthy(item("Opinion: why the naira must float"))).toBe(false);
    expect(newsworthy(item("Budget passes", "https://punchng.com/opinion/x"))).toBe(false);
    expect(newsworthy(item("Senate passes 2027 budget"))).toBe(true);
  });
  it("measures headline overlap", () => {
    expect(similarity(titleTokens("Senate passes 2027 budget"), titleTokens("2027 budget: Senate passes bill"))).toBeGreaterThanOrEqual(0.6);
    expect(similarity(titleTokens("Senate passes budget"), titleTokens("Eagles beat Ghana"))).toBe(0);
  });
  it("ranks Epe first, drops recent repeats and stale items, keeps one story per topic", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    const ranked = rankCandidates([
      item("Brazil holds national election run-off", "https://www.bbc.co.uk/news/brazil", bbc),
      item("Epe fish market traders relocate after fire", "https://punchng.com/epe-fire/"),
      item("Fire: Epe fish market traders relocate", "https://www.vanguardngr.com/epe-fire/", NEWS_OUTLETS.find((o) => o.id === "vanguard")!),
      item("Old story about Lagos traffic from last week", "https://punchng.com/old/", punch, 200),
      item("Senate passes 2027 appropriation budget", "https://punchng.com/budget/"),
    ], ["Senate passes 2027 appropriation budget"], now);
    expect(ranked[0].item.title).toContain("Epe fish market");
    expect(ranked[0].corroborating).toHaveLength(1);
    expect(ranked.some((entry) => entry.item.title.includes("Old story"))).toBe(false);
    expect(ranked.some((entry) => entry.item.title.startsWith("Senate"))).toBe(false);
    expect(ranked.filter((entry) => entry.item.title.toLowerCase().includes("fish market"))).toHaveLength(1);
  });
});

describe("draft validation and the fact guard", () => {
  const draft = validateDraft({
    publish: true,
    title: "Lagos opens new ferry route linking Epe and Ikorodu",
    summary: "The Lagos State Government has opened a ferry route between Epe and Ikorodu, according to Punch.",
    body: [
      { type: "p", text: "The route carries 120 passengers per trip, Punch reported." },
      { type: "p", text: "Officials said the service begins on Monday." },
      { type: "quote", text: "This ferry will cut travel time for thousands of commuters every day" },
      { type: "p", text: "Fares were not announced." },
    ],
    hashtags: ["Epe", "lagos ferry"],
  })!;
  it("accepts a complete draft and rejects a thin one", () => {
    expect(draft.publish).toBe(true);
    expect(validateDraft({ publish: true, title: "Too short", summary: "x", body: [] })).toBeNull();
    expect(validateDraft({ publish: false, reject_reason: "opinion piece" })?.publish).toBe(false);
  });
  it("passes when every figure and quote is in the sources", () => {
    const source = "Punch: the ferry carries 120 passengers. \u201cThis ferry will cut travel time for thousands of commuters every day,\u201d the commissioner said.";
    expect(unsupportedClaims(draft, source)).toEqual([]);
  });
  it("flags invented figures and quotes", () => {
    const problems = unsupportedClaims(draft, "Punch: a ferry route opened between Epe and Ikorodu.");
    expect(problems.some((problem) => problem.includes("120"))).toBe(true);
    expect(problems.some((problem) => problem.startsWith("quote"))).toBe(true);
  });
  it("cleans hashtags to CamelCase, de-duplicated, at most 10", () => {
    const tags = cleanHashtags(["#Epe", "lagos ferry", "epe", "!!"], "Epe Lagos ferry story");
    expect(tags[0]).toBe("Epe");
    expect(tags).toContain("LagosFerry");
    expect(tags.filter((tag) => tag.toLowerCase() === "epe")).toHaveLength(1);
    expect(tags.length).toBeLessThanOrEqual(10);
    for (const tag of tags) expect(tag.length).toBeGreaterThanOrEqual(2);
  });
});

describe("OpenRouter helpers", () => {
  it("keeps only zero-priced :free text models with a usable context", () => {
    const models = freeModelsFromCatalogue({ data: [
      { id: "meta/llama:free", name: "Llama", context_length: 128000, pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["text"] } },
      { id: "paid/model", context_length: 128000, pricing: { prompt: "0.000001", completion: "0.000002" } },
      { id: "sneaky:free", context_length: 128000, pricing: { prompt: "0.1", completion: "0" } },
      { id: "tiny:free", context_length: 4096, pricing: { prompt: "0", completion: "0" } },
      { id: "image:free", context_length: 32000, pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["image"] } },
    ] });
    expect(models.map((model) => model.id)).toEqual(["meta/llama:free"]);
    expect(freeModelsFromCatalogue(null)).toEqual([]);
  });
  it("parses fenced JSON replies", () => {
    expect(parseJsonReply("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(() => parseJsonReply("no json here")).toThrow();
  });
  it("shuffles without losing models", () => {
    const list = ["a", "b", "c", "d", "e"];
    expect(shuffle(list).sort()).toEqual(list);
  });
});

describe("AI email replies", () => {
  it("states that the AI assistant replied", () => {
    expect(AI_REPLY_DISCLOSURE).toMatch(/AI assistant/);
  });
  it("removes links outside the site", () => {
    expect(scrubReply("See https://epelawa.vercel.app/news and https://evil.example/x")).toBe("See https://epelawa.vercel.app/news and [link removed]");
    expect(scrubReply("https://epelawa.vercel.app.evil.example/")).toBe("[link removed]");
  });
});

describe("admin activity logging", () => {
  it("describes devices", () => {
    expect(parseUserAgent("Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36")).toEqual({ device: "Phone (SM-A546E)", browser: "Chrome 131", os: "Android 14" });
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1")).toEqual({ device: "iPhone", browser: "Safari 18", os: "iOS 18.1" });
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0")).toEqual({ device: "Desktop", browser: "Edge 131", os: "Windows 10/11" });
    expect(parseUserAgent(null)).toEqual({ device: null, browser: null, os: null });
  });
  it("names admin sections", () => {
    expect(adminSection("/admin")).toBe("Dashboard");
    expect(adminSection("/admin/ai-scheduler")).toBe("AI Scheduler");
    expect(adminSection("/admin/business-review/123?x=1")).toBe("Businesses");
    expect(adminSection("/admin/settings/cron")).toBe("Settings");
  });
  it("logs real page opens and form actions only", () => {
    const h = (entries: Record<string, string>) => new Headers(entries);
    expect(adminRequestEvent("GET", "/admin/newsroom", h({ "sec-fetch-dest": "document" }))).toBe("page_view");
    expect(adminRequestEvent("GET", "/admin/newsroom", h({ rsc: "1" }))).toBe("page_view");
    expect(adminRequestEvent("GET", "/admin/newsroom", h({ rsc: "1", "next-router-prefetch": "1" }))).toBeNull();
    expect(adminRequestEvent("POST", "/admin/newsroom", h({ "next-action": "abc" }))).toBe("action");
    expect(adminRequestEvent("POST", "/admin/newsroom", h({}))).toBeNull();
    expect(adminRequestEvent("GET", "/admin/login", h({ "sec-fetch-dest": "document" }))).toBeNull();
    expect(adminRequestEvent("GET", "/news", h({ "sec-fetch-dest": "document" }))).toBeNull();
    expect(adminRequestEvent("GET", "/admin/logo.png", h({ "sec-fetch-dest": "document" }))).toBeNull();
  });
});

describe("Lagos time helpers", () => {
  it("formats and buckets in WAT", () => {
    expect(lagosDay("2026-11-25T23:30:00Z")).toBe("2026-11-26");
    expect(lagosHour("2026-11-25T23:30:00Z")).toBe(0);
    expect(lagosExact("2026-11-25T23:30:05Z")).toMatch(/00:30:05 WAT$/);
    expect(lagosExact(null)).toBe("—");
    expect(lagosInputValue("2026-11-25T23:30:00.000Z")).toBe("2026-11-26T00:30");
  });
  it("covers one Lagos calendar day and rejects impossible dates", () => {
    expect(lagosDayRange("2026-11-26")).toEqual({ since: "2026-11-25T23:00:00.000Z", until: "2026-11-26T23:00:00.000Z" });
    expect(lagosDayRange("2026-02-30")).toBeNull();
    expect(lagosDayRange("26-11-2026")).toBeNull();
  });
});
