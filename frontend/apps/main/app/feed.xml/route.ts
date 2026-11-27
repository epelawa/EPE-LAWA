import { createClient } from "../../lib/supabase";
import { absoluteUrl, isIndexingAllowed } from "../../lib/site";

export const dynamic = "force-dynamic";

type FeedArticle = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  author_name: string;
  category_label: string;
};

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function articleDescription(article: FeedArticle): string {
  const text = (article.summary ?? "").trim();
  return text ? escapeXml(text.slice(0, 300)) : "";
}

/**
 * /feed.xml — RSS 2.0 feed of published news stories.
 * Only rows from the `published_articles` view are included, the same gated
 * view every public news page reads.
 */
export async function GET(): Promise<Response> {
  if (!isIndexingAllowed()) return new Response("Not found", { status: 404 });

  let items: FeedArticle[] = [];
  let failed = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("slug,title,summary,published_at,author_name,category_label")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(30);
    if (error) failed = true;
    else items = (data ?? []) as FeedArticle[];
  } catch { failed = true; }

  const builtAt = new Date().toUTCString();
  if (failed) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>EPE LAWA</title><link>${absoluteUrl("/news")}</link><description>The Voice of Epe Division</description><lastBuildDate>${builtAt}</lastBuildDate><item><title>Feed temporarily unavailable</title><link>${absoluteUrl("/news")}</link><description>The newsroom feed could not be read. Nothing is guessed.</description></item></channel></rss>`,
      { status: 503, headers: { "content-type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  const itemXml = items.map((article) => {
    const url = absoluteUrl(`/news/${encodeURIComponent(article.slug)}`);
    const pubDate = article.published_at ? new Date(article.published_at).toUTCString() : null;
    return [
      "    <item>",
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      article.summary?.trim() ? `      <description>${articleDescription(article)}</description>` : null,
      "      <category>Epe Division</category>",
      article.author_name ? `      <dc:creator>${escapeXml(article.author_name)}</dc:creator>` : null,
      pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
      "    </item>",
    ].filter(Boolean).join("\n");
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>EPE LAWA — The Voice of Epe Division</title>
    <link>${absoluteUrl("/news")}</link>
    <description>Published news stories from EPE LAWA, the community platform for Epe Division, Lagos State.</description>
    <language>en-ng</language>
    <lastBuildDate>${builtAt}</lastBuildDate>
    <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>
${itemXml}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" },
  });
}
