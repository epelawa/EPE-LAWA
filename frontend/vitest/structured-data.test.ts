import { describe, expect, it } from "vitest";
import { breadcrumbSchema, jsonLdScript, newsArticleSchema, organizationSchema, websiteSchema } from "../apps/main/lib/structured-data";

describe("structured data builders", () => {
  it("builds WebSite search action and Organization from real identity only", () => {
    const website = websiteSchema() as { potentialAction: { target: { urlTemplate: string } } };
    // Turn 3: /search is retired; the template points straight at the search dialog (old /search?q= still 308s there).
    expect(website.potentialAction.target.urlTemplate).toContain("/?open=search&q={search_term_string}");
    const org = organizationSchema() as { email: string; "@type": string };
    expect(org["@type"]).toBe("Organization");
  });

  it("builds NewsArticle from the published record without inventing metrics", () => {
    const schema = newsArticleSchema({
      slug: "market-day-report",
      title: "Report on the Epe fish market",
      summary: "A sourced report.",
      published_at: "2026-11-20T08:00:00.000Z",
      cover_url: "/news-media/epe-lagoon-editorial.webp",
      cover_alt: "Epe lagoon",
      author_name: "Newsroom Desk",
      author_slug: "newsroom",
      section: { slug: "local", label: "Local" },
      tags: [{ slug: "markets", label: "Markets" }],
    }) as Record<string, unknown>;
    expect(schema["@type"]).toBe("NewsArticle");
    expect(schema.articleSection).toBe("Local");
    expect(schema.image).toEqual(["https://epelawa.vercel.app/news-media/epe-lagoon-editorial.webp"]);
    expect((schema.publisher as { logo: { url: string } }).logo.url).toContain("/brand-logo.png");
    expect(JSON.stringify(schema)).not.toMatch(/rating|count| Aggregate/);
  });

  it("escapes closing script tags and angle brackets in JSON-LD payloads", () => {
    const payload = jsonLdScript({ headline: "</script><img src=x onerror=alert(1)>" });
    expect(payload).not.toContain("</");
    expect(payload).toContain("\\u003c");
  });

  it("builds breadcrumbs with absolute URLs and 1-based positions", () => {
    const schema = breadcrumbSchema([
      { name: "News", path: "/news" },
      { name: "Local", path: "/news?category=local" },
    ]) as { itemListElement: { position: number; item: string }[] };
    expect(schema.itemListElement.map(item => item.position)).toEqual([1, 2]);
    expect(schema.itemListElement[0].item).toBe("https://epelawa.vercel.app/news");
  });
});
