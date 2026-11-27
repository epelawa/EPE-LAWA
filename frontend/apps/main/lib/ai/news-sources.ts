/**
 * The only outlets the AI desk may read. Each is an established newsroom with
 * named editors and a corrections policy; nothing else (blogs, aggregators,
 * social media, press-release wires) is ever fetched or cited. Hosts are
 * matched exactly (or as a subdomain of the listed domain) on every redirect.
 */

export type Desk = "local" | "nigeria" | "business" | "sport" | "world";
export type Outlet = { id: string; name: string; feed: string; domains: string[]; desk: Desk; country: "NG" | "INT" };

export const NEWS_OUTLETS: readonly Outlet[] = [
  { id: "punch", name: "Punch", feed: "https://punchng.com/feed/", domains: ["punchng.com"], desk: "nigeria", country: "NG" },
  { id: "vanguard", name: "Vanguard", feed: "https://www.vanguardngr.com/feed/", domains: ["vanguardngr.com"], desk: "nigeria", country: "NG" },
  { id: "premiumtimes", name: "Premium Times", feed: "https://www.premiumtimesng.com/feed", domains: ["premiumtimesng.com"], desk: "nigeria", country: "NG" },
  { id: "channels", name: "Channels Television", feed: "https://www.channelstv.com/feed/", domains: ["channelstv.com"], desk: "nigeria", country: "NG" },
  { id: "guardianng", name: "The Guardian Nigeria", feed: "https://guardian.ng/feed/", domains: ["guardian.ng"], desk: "nigeria", country: "NG" },
  { id: "thecable", name: "TheCable", feed: "https://www.thecable.ng/feed", domains: ["thecable.ng"], desk: "nigeria", country: "NG" },
  { id: "dailytrust", name: "Daily Trust", feed: "https://dailytrust.com/feed/", domains: ["dailytrust.com"], desk: "nigeria", country: "NG" },
  { id: "businessday", name: "BusinessDay", feed: "https://businessday.ng/feed/", domains: ["businessday.ng"], desk: "business", country: "NG" },
  { id: "nairametrics", name: "Nairametrics", feed: "https://nairametrics.com/feed/", domains: ["nairametrics.com"], desk: "business", country: "NG" },
  { id: "lagosgov", name: "Lagos State Government", feed: "https://lagosstate.gov.ng/feed/", domains: ["lagosstate.gov.ng"], desk: "local", country: "NG" },
  { id: "bbc-africa", name: "BBC News", feed: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", domains: ["bbc.co.uk", "bbc.com", "bbci.co.uk"], desk: "world", country: "INT" },
  { id: "bbc-world", name: "BBC News", feed: "https://feeds.bbci.co.uk/news/world/rss.xml", domains: ["bbc.co.uk", "bbc.com", "bbci.co.uk"], desk: "world", country: "INT" },
  { id: "bbc-business", name: "BBC News", feed: "https://feeds.bbci.co.uk/news/business/rss.xml", domains: ["bbc.co.uk", "bbc.com", "bbci.co.uk"], desk: "business", country: "INT" },
  { id: "bbc-sport", name: "BBC Sport", feed: "https://feeds.bbci.co.uk/sport/football/rss.xml", domains: ["bbc.co.uk", "bbc.com", "bbci.co.uk"], desk: "sport", country: "INT" },
  { id: "aljazeera", name: "Al Jazeera", feed: "https://www.aljazeera.com/xml/rss/all.xml", domains: ["aljazeera.com"], desk: "world", country: "INT" },
  { id: "guardian-world", name: "The Guardian", feed: "https://www.theguardian.com/world/rss", domains: ["theguardian.com", "guim.co.uk"], desk: "world", country: "INT" },
  { id: "france24-africa", name: "France 24", feed: "https://www.france24.com/en/africa/rss", domains: ["france24.com"], desk: "world", country: "INT" },
  { id: "npr-world", name: "NPR", feed: "https://feeds.npr.org/1004/rss.xml", domains: ["npr.org"], desk: "world", country: "INT" },
] as const;

export function outletForHost(host: string): Outlet | null {
  const value = host.toLowerCase().replace(/\.$/, "");
  return NEWS_OUTLETS.find((outlet) => outlet.domains.some((domain) => value === domain || value.endsWith(`.${domain}`))) ?? null;
}

export function trustedNewsHost(host: string): boolean {
  return outletForHost(host) !== null;
}

/** Epe first, then Lagos, then Nigeria, then the world (owner's priority order). */
export function localityScore(text: string): { score: number; label: "Epe" | "Lagos" | "Nigeria" | "World" } {
  const value = ` ${text.toLowerCase()} `;
  if (/\bepe\b|\bijebu[- ]?epe\b|\bnoforija\b|\bejinrin\b|\bposuka\b|\bagbowa\b|\bikosi[- ]ejinrin\b|\beredo\b|\bitoikin\b|\blekki free trade zone\b|\bdangote refinery\b/.test(value)) return { score: 100, label: "Epe" };
  if (/\blagos\b|\bikorodu\b|\bibeju[- ]?lekki\b|\blekki\b|\bikeja\b|\bsanwo-?olu\b|\blasg\b|\bbadagry\b|\bsurulere\b|\bvictoria island\b/.test(value)) return { score: 60, label: "Lagos" };
  if (/\bnigeria\b|\bnigerian\b|\babuja\b|\btinubu\b|\bnaira\b|\bcbn\b|\binec\b|\bsuper eagles\b|\bnpfl\b|\becowas\b/.test(value)) return { score: 35, label: "Nigeria" };
  return { score: 10, label: "World" };
}

export type FeedItem = { outlet: Outlet; title: string; link: string; summary: string; publishedAt: string | null; image: string | null };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };

export function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(value: string): string {
  return decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? match[1] : null;
}

function attribute(block: string, element: string, attr: string): string | null {
  const match = block.match(new RegExp(`<${element}\\b[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

export function parseFeed(xml: string, outlet: Outlet): FeedItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const block of blocks.slice(0, 40)) {
    const title = stripTags(tag(block, "title") ?? "");
    let link = stripTags(tag(block, "link") ?? "");
    if (!link) link = attribute(block, "link", "href") ?? "";
    const summary = stripTags(tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content:encoded") ?? "").slice(0, 600);
    const dateText = stripTags(tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date") ?? "");
    const date = dateText ? new Date(dateText) : null;
    const image = attribute(block, "media:content", "url") ?? attribute(block, "media:thumbnail", "url") ?? attribute(block, "enclosure", "url");
    if (!title || title.length < 12 || !/^https:\/\//.test(link)) continue;
    let host = "";
    try { host = new URL(link).hostname; } catch { continue; }
    if (!trustedNewsHost(host)) continue;
    items.push({ outlet, title: title.slice(0, 300), link, summary, publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null, image });
  }
  return items;
}

/** Sponsored posts, opinion columns, live blogs and quizzes are never rewritten as news. */
export function newsworthy(item: FeedItem): boolean {
  const value = `${item.title} ${item.link}`.toLowerCase();
  return !/(sponsored|advertorial|press release|opinion|op-ed|editorial:|column|live updates|live:|quiz|horoscope|betting|odds|crossword|\/opinion\/|\/columns?\/|\/live\/|\/sponsored\/|\/pr-?news\/)/.test(value);
}

const STOP = new Set("the a an of to in on for and or with at by from as is are was were be after over into says said new amid how why what who will has have its their his her this that than more about".split(" "));

export function titleTokens(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)));
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

export type ExtractedPage = { text: string; image: string | null; description: string | null; publishedAt: string | null };

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return null;
}

/** Reads the report's own text (paragraphs) and its large share image. */
export function extractArticle(html: string): ExtractedPage {
  const scope = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html;
  const paragraphs = (scope.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [])
    .map(stripTags)
    .filter((text) => text.length > 40 && !/^(advertisement|read also|also read|related|subscribe|follow us|click here|sign up|copyright|©)/i.test(text));
  const text = paragraphs.join("\n\n").slice(0, 7000);
  const image = meta(html, "og:image:secure_url") ?? meta(html, "og:image") ?? meta(html, "twitter:image");
  return {
    text,
    image: image && /^https:\/\//.test(image) ? image : null,
    description: meta(html, "og:description") ?? meta(html, "description"),
    publishedAt: meta(html, "article:published_time"),
  };
}
