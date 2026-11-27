/**
 * The only outlets the AI desk may read. Each is an established newsroom with
 * named editors and a corrections policy; nothing else (blogs, aggregators,
 * social media, press-release wires) is ever fetched or cited. Hosts are
 * matched exactly (or as a subdomain of the listed domain) on every redirect.
 *
 * Owner's rule (turn 26): EPE LAWA covers Epe Division only — Epe and
 * Ibeju-Lekki local governments and their LCDAs (Epe, Eredo, Ikosi-Ejinrin,
 * Ibeju-Lekki, Lekki). No Lagos-wide, national or international news. Each
 * newsroom is read through its "Epe" and "Ibeju-Lekki" search feeds plus its
 * main feed, and only stories that are actually about a place in Epe Division
 * are ever considered.
 */

export type Desk = "epe" | "local" | "nigeria";

/** Plain-English names for the admin page. */
export const DESK_LABELS: Record<Desk, string> = { epe: "Epe Division searches", local: "Lagos State Government", nigeria: "Newsroom main feeds (Epe stories only)" };
export type Outlet = { id: string; name: string; feed: string; domains: string[]; desk: Desk; country: "NG" };

type Newsroom = { id: string; name: string; base: string; domains: string[]; feed: string; search: boolean };

const NEWSROOMS: Newsroom[] = [
  { id: "punch", name: "Punch", base: "https://punchng.com/", domains: ["punchng.com"], feed: "https://punchng.com/feed/", search: true },
  { id: "vanguard", name: "Vanguard", base: "https://www.vanguardngr.com/", domains: ["vanguardngr.com"], feed: "https://www.vanguardngr.com/feed/", search: true },
  { id: "premiumtimes", name: "Premium Times", base: "https://www.premiumtimesng.com/", domains: ["premiumtimesng.com"], feed: "https://www.premiumtimesng.com/feed", search: true },
  { id: "channels", name: "Channels Television", base: "https://www.channelstv.com/", domains: ["channelstv.com"], feed: "https://www.channelstv.com/feed/", search: true },
  { id: "guardianng", name: "The Guardian Nigeria", base: "https://guardian.ng/", domains: ["guardian.ng"], feed: "https://guardian.ng/feed/", search: true },
  { id: "thecable", name: "TheCable", base: "https://www.thecable.ng/", domains: ["thecable.ng"], feed: "https://www.thecable.ng/feed", search: true },
  { id: "dailytrust", name: "Daily Trust", base: "https://dailytrust.com/", domains: ["dailytrust.com"], feed: "https://dailytrust.com/feed/", search: true },
  { id: "nta", name: "NTA News", base: "https://www.nta.ng/", domains: ["nta.ng"], feed: "https://www.nta.ng/feed/", search: true },
  { id: "businessday", name: "BusinessDay", base: "https://businessday.ng/", domains: ["businessday.ng"], feed: "https://businessday.ng/feed/", search: true },
  { id: "nairametrics", name: "Nairametrics", base: "https://nairametrics.com/", domains: ["nairametrics.com"], feed: "https://nairametrics.com/feed/", search: true },
  { id: "tribune", name: "Nigerian Tribune", base: "https://tribuneonlineng.com/", domains: ["tribuneonlineng.com"], feed: "https://tribuneonlineng.com/feed/", search: true },
  { id: "leadership", name: "Leadership", base: "https://leadership.ng/", domains: ["leadership.ng"], feed: "https://leadership.ng/feed/", search: true },
];

/** WordPress search feeds (?s=…&feed=rss2) — the newsroom's own stories that mention the place. */
export const EPE_SEARCH_TERMS = ["Epe", "Ibeju-Lekki"] as const;

function searchFeed(base: string, term: string): string {
  const url = new URL(base);
  url.searchParams.set("s", term);
  url.searchParams.set("feed", "rss2");
  return url.toString();
}

export const NEWS_OUTLETS: readonly Outlet[] = [
  ...NEWSROOMS.flatMap((room) => (room.search ? EPE_SEARCH_TERMS.map((term) => ({ id: `${room.id}-${term.toLowerCase()}`, name: room.name, feed: searchFeed(room.base, term), domains: room.domains, desk: "epe" as const, country: "NG" as const })) : [])),
  ...NEWSROOMS.map((room) => ({ id: room.id, name: room.name, feed: room.feed, domains: room.domains, desk: "nigeria" as const, country: "NG" as const })),
  { id: "lagosgov", name: "Lagos State Government", feed: "https://lagosstate.gov.ng/feed/", domains: ["lagosstate.gov.ng"], desk: "local", country: "NG" },
  { id: "lagosgov-epe", name: "Lagos State Government", feed: "https://lagosstate.gov.ng/?s=Epe&feed=rss2", domains: ["lagosstate.gov.ng"], desk: "local", country: "NG" },
];

export function outletForHost(host: string): Outlet | null {
  const value = host.toLowerCase().replace(/\.$/, "");
  return NEWS_OUTLETS.find((outlet) => outlet.domains.some((domain) => value === domain || value.endsWith(`.${domain}`))) ?? null;
}

export function trustedNewsHost(host: string): boolean {
  return outletForHost(host) !== null;
}

/**
 * Places in Epe Division. Plain "Lekki" (Lekki Phase 1, in Eti-Osa) and plain
 * "Ikosi" (Ketu-Ikosi, in Kosofe) are deliberately not on the list.
 */
export const EPE_DIVISION_PLACES = [
  "Epe", "Ijebu-Epe", "Epe Division", "Ibeju-Lekki", "Ibeju Lekki", "Ibeju", "Eredo", "Ikosi-Ejinrin", "Ejinrin", "Noforija", "Poka", "Agbowa", "Itoikin",
  "Odomola", "Odoragunsin", "Orimedu", "Lakowe", "Awoyaya", "Bogije", "Abijo", "Eleko", "Akodo", "Magbon", "Siriwon", "Igbonla", "Lekki Free Trade Zone",
  "Lekki Free Zone", "Lagos Free Zone", "Lekki Deep Sea Port", "Lekki Deep Seaport", "Lekki Port", "Dangote Refinery", "Dangote Petroleum Refinery", "Alaro City", "Lekki-Epe", "Epe-Ijebu",
] as const;

const PLACE_PATTERN = new RegExp(String.raw`(^|[^\p{L}])(${[...EPE_DIVISION_PLACES].sort((a, b) => b.length - a.length).map((place) => place.replace(/[-\s]/g, "[-\\s]?")).join("|")})(?=[^\p{L}]|$)`, "iu");

/** The Epe Division place a text is about, or null when it is not about Epe Division. */
export function epeDivisionPlace(text: string): string | null {
  // "EPE LAWA" is this site's own name, not the town.
  const match = text.replace(/epe\s*lawa/gi, " ").match(PLACE_PATTERN);
  return match ? match[2] : null;
}

/** Epe Division only (owner's rule): anything else scores 0 and is never written. */
export function localityScore(text: string): { score: number; label: "Epe" | "Outside"; place: string | null } {
  const place = epeDivisionPlace(text);
  return place ? { score: 100, label: "Epe", place } : { score: 0, label: "Outside", place: null };
}

export type FeedItem = { outlet: Outlet; title: string; link: string; summary: string; publishedAt: string | null; image: string | null; content?: string };

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
    // Many newsroom feeds carry the full report in content:encoded — a reliable fallback when the page itself is blocked.
    const fullText = paragraphText(tag(block, "content:encoded") ?? tag(block, "content") ?? "");
    const dateText = stripTags(tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date") ?? "");
    const date = dateText ? new Date(dateText) : null;
    const image = attribute(block, "media:content", "url") ?? attribute(block, "media:thumbnail", "url") ?? attribute(block, "enclosure", "url");
    if (!title || title.length < 12 || !/^https:\/\//.test(link)) continue;
    let host = "";
    try { host = new URL(link).hostname; } catch { continue; }
    if (!trustedNewsHost(host)) continue;
    items.push({ outlet, title: title.slice(0, 300), link, summary, publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null, image, content: fullText.length > summary.length ? fullText : undefined });
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

const BOILERPLATE = /^(advertisement|read also|also read|read more|related|subscribe|follow us|click here|sign up|copyright|©|join our|download our|share this|you may also like|recommended)/i;

/** Paragraph text from an HTML fragment (CDATA-safe), without navigation or promo lines. */
export function paragraphText(fragment: string): string {
  const html = fragment.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const decoded = /&lt;p\b/i.test(html) && !/<p\b/i.test(html) ? decodeEntities(html) : html;
  const paragraphs = (decoded.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [])
    .map(stripTags)
    .filter((text) => text.length > 40 && !BOILERPLATE.test(text));
  return paragraphs.join("\n\n").slice(0, 8000);
}

/** `articleBody` from schema.org JSON-LD, which most newsroom CMSs publish even when the layout is hard to read. */
function jsonLdArticleBody(html: string): string {
  let best = "";
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try { data = JSON.parse(match[1].trim()); } catch { continue; }
    const queue: unknown[] = [data];
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) { queue.push(...node); continue; }
      if (!node || typeof node !== "object") continue;
      const record = node as Record<string, unknown>;
      if (typeof record.articleBody === "string") {
        const text = stripTags(record.articleBody).slice(0, 8000);
        if (text.length > best.length) best = text;
      }
      if (record["@graph"]) queue.push(record["@graph"]);
    }
  }
  return best;
}

/**
 * Reads the report's own text and its large share image. Tries, in order of
 * size: JSON-LD articleBody, the richest <article> element (pages often have
 * several small "related story" cards before the real one), then every
 * paragraph on the page.
 */
export function extractArticle(html: string): ExtractedPage {
  const articleBlocks = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  const fromArticles = articleBlocks.map(paragraphText).sort((a, b) => b.length - a.length)[0] ?? "";
  const candidates = [jsonLdArticleBody(html), fromArticles];
  if (fromArticles.length < 600) candidates.push(paragraphText(html));
  const text = candidates.sort((a, b) => b.length - a.length)[0] ?? "";
  const image = meta(html, "og:image:secure_url") ?? meta(html, "og:image") ?? meta(html, "twitter:image");
  return {
    text: text.slice(0, 7000),
    image: image && /^https:\/\//.test(image) ? image : null,
    description: meta(html, "og:description") ?? meta(html, "description"),
    publishedAt: meta(html, "article:published_time"),
  };
}
