import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatJson, type Budget } from "../openrouter";
import { fetchPublicText } from "../safe-fetch";
import { extractArticle, localityScore, NEWS_OUTLETS, newsworthy, parseFeed, similarity, titleTokens, trustedNewsHost, type FeedItem } from "../news-sources";
import { chooseCover } from "../news-images";
import { suggestNewsHashtags } from "../../../../admin/lib/news-hashtags";
import { fanoutPush } from "../../push-fanout";
import { pushSenderReady, type WebPushPayload } from "../../web-push-send";
import { pushCryptoReady } from "../../push-crypto";
import { rpcProblem, type RunLog } from "../activity";
import type { AiSettings } from "../settings";
import { NEWS_LIMITS, storiesOwed } from "../news-schedule";

const MAX_AGE_HOURS = 30;

export function urlHash(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

type Category = { id: string; slug: string; label: string };
type Candidate = { item: FeedItem; locality: ReturnType<typeof localityScore>; score: number; corroborating: FeedItem[] };

export type Draft = {
  publish: boolean;
  rejectReason: string;
  title: string;
  summary: string;
  blocks: { type: "p" | "h2" | "quote"; text: string }[];
  categorySlug: string | null;
  newCategory: string | null;
  hashtags: string[];
  seoTitle: string;
  seoDescription: string;
  imageAlt: string;
  /** 2–6 words to search for a similar, freely licensed photo when the report has none. */
  imageQuery: string;
  /** A short scene description for a generated illustration (no names, logos or text). */
  imagePrompt: string;
  /** Kept for older model replies; every published story now notifies subscribers. */
  push: boolean;
  /** The model judged this urgent, developing news: it joins the breaking-news ticker. */
  breaking: boolean;
};

function text(value: unknown, min: number, max: number): string | null {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

export function validateDraft(value: unknown): Draft | null {
  const row = value as Record<string, unknown>;
  if (!row || typeof row !== "object") return null;
  const publish = row.publish === true;
  const rejectReason = typeof row.reject_reason === "string" ? row.reject_reason.slice(0, 500) : "";
  if (!publish) return { publish, rejectReason: rejectReason || "The model judged the sources unsuitable.", title: "", summary: "", blocks: [], categorySlug: null, newCategory: null, hashtags: [], seoTitle: "", seoDescription: "", imageAlt: "", imageQuery: "", imagePrompt: "", push: false, breaking: false };
  const title = text(row.title, 15, 160);
  const summary = text(row.summary, 40, 400);
  const rawBlocks = Array.isArray(row.body) ? row.body : [];
  const blocks = rawBlocks.map((block) => {
    const entry = block as Record<string, unknown>;
    const type = entry?.type === "h2" || entry?.type === "quote" ? entry.type : "p";
    const body = text(entry?.text, 2, 1500);
    return body ? { type, text: body } as Draft["blocks"][number] : null;
  }).filter((block): block is Draft["blocks"][number] => block !== null);
  if (!title || !summary || blocks.filter((block) => block.type === "p").length < 3) return null;
  const hashtags = Array.isArray(row.hashtags) ? row.hashtags.filter((tag): tag is string => typeof tag === "string") : [];
  return {
    publish,
    rejectReason,
    title,
    summary,
    blocks: blocks.slice(0, 18),
    categorySlug: typeof row.category_slug === "string" ? row.category_slug.trim().toLowerCase() : null,
    newCategory: typeof row.new_category === "string" && row.new_category.trim() ? row.new_category.trim().slice(0, 40) : null,
    hashtags,
    seoTitle: (text(row.seo_title, 10, 70) ?? title).slice(0, 70),
    seoDescription: (text(row.seo_description, 30, 160) ?? summary).slice(0, 160),
    imageAlt: (text(row.image_alt, 5, 200) ?? title).slice(0, 200),
    imageQuery: (text(row.image_query, 3, 120) ?? "").slice(0, 120),
    imagePrompt: (text(row.image_prompt, 6, 300) ?? "").slice(0, 300),
    push: row.push === true,
    breaking: row.breaking === true,
  };
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, "\"").replace(/\s+/g, " ");
}

/**
 * Deterministic fact guard on top of the model's instructions: every figure and
 * every direct quote in the article must appear in the source reports.
 */
export function unsupportedClaims(draft: Draft, sourceText: string): string[] {
  const source = normalise(sourceText);
  const sourceNumbers = new Set((source.match(/\d[\d,.]*/g) ?? []).map((value) => value.replace(/[,.]+$/, "").replace(/,/g, "")));
  const problems: string[] = [];
  const all = [draft.title, draft.summary, ...draft.blocks.map((block) => block.text)].join("\n");
  for (const raw of all.match(/\d[\d,.]*/g) ?? []) {
    const value = raw.replace(/[,.]+$/, "").replace(/,/g, "");
    if (value.length < 2) continue;
    if (!sourceNumbers.has(value) && !source.includes(value)) problems.push(`figure “${raw}” is not in the sources`);
  }
  const quotes = [...all.matchAll(/[“"]([^”"]{25,})[”"]/g)].map((match) => match[1]);
  for (const block of draft.blocks.filter((entry) => entry.type === "quote")) quotes.push(block.text.replace(/^[“"]|[”"]$/g, ""));
  for (const quote of quotes) {
    const probe = normalise(quote).replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    const haystack = source.replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ");
    if (probe.length >= 20 && !haystack.includes(probe)) problems.push(`quote “${quote.slice(0, 60)}…” is not in the sources`);
  }
  return [...new Set(problems)].slice(0, 8);
}

export function cleanHashtags(model: string[], text: string): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of [...model, ...suggestNewsHashtags(text)]) {
    const words = raw.replace(/^#/, "").replace(/[^\p{L}\p{N} ]+/gu, " ").trim().split(/\s+/).filter(Boolean);
    const tag = words.map((word) => (word === word.toUpperCase() && word.length <= 5 ? word : word[0].toUpperCase() + word.slice(1))).join("");
    if (tag.length < 2 || tag.length > 40 || !/[a-z0-9]/i.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tag);
    if (output.length >= 10) break;
  }
  return output;
}

function textNode(value: string, href?: string) {
  return href ? { type: "text", text: value, marks: [{ type: "link", attrs: { href } }] } : { type: "text", text: value };
}

/**
 * The published story. Sources stay in the article's private record for
 * editors and corrections; the public story never names or links the outlets
 * the AI read (owner's rule), and never shows their logos.
 */
export function articleBody(draft: Draft) {
  const content: unknown[] = draft.blocks.map((block) =>
    block.type === "h2"
      ? { type: "heading", attrs: { level: 2 }, content: [textNode(block.text)] }
      : block.type === "quote"
        ? { type: "blockquote", content: [{ type: "paragraph", content: [textNode(block.text)] }] }
        : { type: "paragraph", content: [textNode(block.text)] },
  );
  content.push({
    type: "paragraph",
    content: [{ type: "text", text: "Written by the EPE LAWA AI desk from several public reports, checked against them before publishing, and published by the Epe Lawa Editorial Desk. Spotted an error? Use the correction form below.", marks: [{ type: "italic" }] }],
  });
  return { type: "doc", content };
}

/** Outlet names the public story must never carry (case-sensitive brand forms). */
export function outletNames(): string[] {
  const names = new Set<string>();
  for (const outlet of NEWS_OUTLETS) {
    // A government's own newsroom is a newsmaker, not a platform: it may be named as the speaker.
    if (outlet.desk === "local" && /government/i.test(outlet.name)) continue;
    names.add(outlet.name);
    names.add(outlet.name.replace(/^The /, ""));
    for (const domain of outlet.domains) names.add(domain);
  }
  for (const extra of ["Punch Newspapers", "PUNCH", "Channels TV", "Channels Television", "Vanguard News", "Premium Times", "NTA", "Nigerian Television Authority", "BBC", "CNN", "Reuters", "AFP", "AP News", "Associated Press", "Daily Trust", "TheCable", "ThisDay", "Sahara Reporters", "Legit.ng", "Pulse Nigeria"]) names.add(extra);
  return [...names].filter((name) => name.length >= 3).sort((a, b) => b.length - a.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes outlet credits the model slipped in ("according to Punch",
 * "Channels Television reported that …") and reports any outlet name left.
 */
export function scrubOutletMentions(value: string, names = outletNames()): { text: string; left: string[] } {
  const alternatives = names.map(escapeRegExp).join("|");
  const medium = String.raw`(?:\s+(?:newspaper|news|television|tv|online|reports?|correspondent|reporter))?`;
  let text = value
    .replace(new RegExp(String.raw`,?\s*(?:according to|as reported by|reports by|a report by|citing|in a report by)\s+(?:the\s+)?(?:${alternatives})${medium}`, "g"), "")
    .replace(new RegExp(String.raw`(^|[.!?]\s+)(?:The\s+)?(?:${alternatives})${medium}\s+(?:reported|reports|said|says|learnt|learned|gathered|understands|quoted|noted)\s+(?:that\s+)?(\p{Ll})`, "gu"), (_m, lead: string, first: string) => `${lead}${first.toUpperCase()}`)
    .replace(new RegExp(String.raw`\s*\((?:${alternatives})\)`, "g"), "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (text && /^\p{Ll}/u.test(text)) text = text[0].toUpperCase() + text.slice(1);
  const left = names.filter((name) => new RegExp(String.raw`(^|[^\p{L}])${escapeRegExp(name)}([^\p{L}]|$)`, "u").test(text));
  return { text, left };
}

/** Applies the scrub to every part of a draft; returns any names still present. */
export function scrubDraft(draft: Draft): string[] {
  const names = outletNames();
  const left = new Set<string>();
  const clean = (value: string) => {
    const result = scrubOutletMentions(value, names);
    result.left.forEach((name) => left.add(name));
    return result.text;
  };
  draft.title = clean(draft.title);
  draft.summary = clean(draft.summary);
  draft.seoTitle = clean(draft.seoTitle);
  draft.seoDescription = clean(draft.seoDescription);
  draft.imageAlt = clean(draft.imageAlt);
  draft.blocks = draft.blocks.map((block) => ({ ...block, text: clean(block.text) })).filter((block) => block.text.length > 1);
  return [...left];
}

export const NEWS_SYSTEM_PROMPT = `You are the news writer for EPE LAWA, a community newsroom for Epe Division, Lagos State, Nigeria.
You turn verified reports into a completely new, original EPE LAWA news story.
Hard rules:
- Use ONLY facts stated in the SOURCE REPORTS. Never add names, numbers, dates, places, quotes or background that are not in them.
- NEVER name, credit, link or mention the newspapers, TV or radio stations, websites, agencies or journalists that published the SOURCE REPORTS (for example never write "according to Punch", "NTA reported", "Channels Television said", "BBC News", "a report by Vanguard"). Readers must not be able to tell which outlet the facts came from. Attribute statements to the people and institutions in the story itself (the police, the minister, the court, the club, residents).
- Rewrite COMPLETELY: a new headline, a new opening paragraph, your own structure and order, your own words. Never copy or lightly edit a sentence from a report. The only words you may copy are short direct quotes from people in the story, exactly as written, in quotation marks.
- Plain British English, clear for Nigerian readers. No speculation, opinion, sensationalism or clickbait.
- If the sources are thin, contradictory, opinion, sponsored, graphic, defamatory, about a minor, or not real news, set publish to false and explain why in reject_reason.
- Say why it matters to readers in Epe, Lagos or Nigeria when the sources support it; never invent local angles.
Return ONLY a JSON object:
{"publish":true|false,"reject_reason":"","title":"max 110 chars","summary":"1-2 sentences, max 280 chars","body":[{"type":"p"|"h2"|"quote","text":"..."}],"category_slug":"one existing slug or null","new_category":"short label only if no existing category fits, else null","hashtags":["4 to 8 CamelCase hashtags without #, never an outlet name"],"seo_title":"max 65 chars","seo_description":"max 155 chars","image_alt":"describes a fitting lead photo for the story, max 150 chars","image_query":"2 to 5 plain words to search for a similar real photo of the subject (places, objects, events; no outlet names), e.g. Lagos ferry terminal","image_prompt":"one sentence describing a neutral scene that illustrates the story without real identifiable people, text or logos, e.g. a busy ferry jetty on a lagoon at sunrise","breaking":true only for urgent, developing news that readers need to know right now (a major incident, emergency, disaster, security alert, election result, death of a major public figure, or a decision that takes effect today); false for routine news, features, analysis and sport results}
Body: 5 to 10 paragraphs, optional short h2 subheadings. Do not include a sources list or any outlet credit.`;

async function fetchFeeds(): Promise<FeedItem[]> {
  const results = await Promise.all(NEWS_OUTLETS.map(async (outlet) => {
    const page = await fetchPublicText(outlet.feed, { timeoutMs: 7000, maxBytes: 900_000, accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5", allowHosts: trustedNewsHost });
    return page && page.status < 400 ? parseFeed(page.text, outlet) : [];
  }));
  return results.flat();
}

/** The longest usable text among the page, the feed's full text, the page description and the feed summary. */
export function bestReportText(options: readonly (string | null | undefined)[]): string {
  return options.filter((value): value is string => typeof value === "string").map((value) => value.trim()).sort((a, b) => b.length - a.length)[0] ?? "";
}

export function rankCandidates(items: FeedItem[], recentTitles: string[], now = Date.now()): Candidate[] {
  const recent = recentTitles.map(titleTokens);
  const fresh = items.filter((item) => newsworthy(item) && item.publishedAt && now - Date.parse(item.publishedAt) < MAX_AGE_HOURS * 3600_000);
  const tokens = new Map(fresh.map((item) => [item, titleTokens(item.title)]));
  const candidates: Candidate[] = [];
  for (const item of fresh) {
    const own = tokens.get(item)!;
    if (recent.some((seen) => similarity(own, seen) >= 0.6)) continue;
    const corroborating = fresh.filter((other) => other !== item && other.outlet.name !== item.outlet.name && similarity(own, tokens.get(other)!) >= 0.45);
    const locality = localityScore(`${item.title} ${item.summary}`);
    const ageHours = (now - Date.parse(item.publishedAt!)) / 3600_000;
    // Every subject desk (sport, business, politics, entertainment, tech, health,
    // science) gets a lift so the site carries all kinds of news, not only politics.
    const desk = ["sport", "business", "politics", "entertainment", "tech", "health", "science"].includes(item.outlet.desk) ? 6 : 0;
    const score = locality.score + Math.max(0, 20 - ageHours) + Math.min(3, corroborating.length) * 6 + desk + (item.outlet.country === "NG" ? 4 : 0);
    candidates.push({ item, locality, score, corroborating });
  }
  candidates.sort((a, b) => b.score - a.score);
  // One story per topic: drop near-duplicates of a higher-ranked pick.
  const picked: Candidate[] = [];
  for (const candidate of candidates) {
    const own = tokens.get(candidate.item)!;
    if (picked.some((other) => similarity(own, tokens.get(other.item)!) >= 0.45)) continue;
    picked.push(candidate);
  }
  return picked;
}

/**
 * The stories a run will write, oldest report first, so the newest news is
 * published last and sits at the top of the site. Backups (used only when a
 * story cannot be read) keep their ranking after them.
 */
export function publishingOrder<T extends { item: FeedItem }>(pool: T[], target: number): T[] {
  const time = (candidate: T) => (candidate.item.publishedAt ? Date.parse(candidate.item.publishedAt) : 0);
  const chosen = pool.slice(0, target).sort((a, b) => time(a) - time(b));
  return [...chosen, ...pool.slice(target)];
}

/** The model sees "Report 1", "Report 2" — never which outlet wrote what. */
export function anonymousReports(reports: { outlet: string; outlet_id?: string; url: string; title: string; published_at: string | null; text: string }[]) {
  return reports.map((report, index) => ({ report: `Report ${index + 1}`, title: report.title, published_at: report.published_at, text: report.text }));
}

export function withoutOutletTags(tags: string[]): string[] {
  const banned = new Set(outletNames().map((name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "")));
  return tags.filter((tag) => !banned.has(tag.toLowerCase().replace(/[^a-z0-9]+/g, "")));
}

function fallbackCategory(categories: Category[], candidate: Candidate): Category | undefined {
  const by = (slug: string) => categories.find((category) => category.slug === slug);
  if (candidate.item.outlet.desk === "sport") return by("sports");
  if (candidate.item.outlet.desk === "business") return by("business");
  if (candidate.item.outlet.desk === "politics") return by("politics");
  if (candidate.item.outlet.desk === "entertainment") return by("entertainment");
  if (candidate.locality.label === "Epe" || candidate.locality.label === "Lagos") return by("lagos-news");
  if (candidate.locality.label === "World") return by("international-news");
  return by("other");
}

export async function runNewsJob(db: SupabaseClient, ctx: { settings: AiSettings; log: RunLog; budget: Budget; deadline: number; publish: boolean; target?: number }): Promise<string> {
  const { settings, log, budget, deadline, publish } = ctx;
  // The administrators' "stories per run" (or what is still owed from the last run).
  const target = Math.max(1, Math.min(NEWS_LIMITS.articles.max, ctx.target ?? settings.articles_per_run));
  const owe = async (count: number) => {
    await db.from("ai_settings").update({ news_owed: count }).eq("id", 1);
  };
  await log.step(`Reading the latest reports from ${NEWS_OUTLETS.length} trusted outlet feeds…`);
  const [items, recentResult, categoriesResult] = await Promise.all([
    fetchFeeds(),
    db.from("ai_news_seen").select("title").gte("first_seen_at", new Date(Date.now() - 72 * 3600_000).toISOString()).limit(500),
    db.from("categories").select("id,slug,label").eq("is_active", true),
  ]);
  const categories = (categoriesResult.data ?? []) as Category[];
  if (!items.length) {
    await log.record({ job: "news", action: "news.fetch", outcome: "failed", title: "No outlet feed could be read", reason: "Every trusted outlet feed failed or timed out this hour. Nothing was published." });
    await owe(0);
    return "No feeds could be read.";
  }
  const hashes = items.map((item) => urlHash(item.link));
  const seen = new Set<string>();
  for (let index = 0; index < hashes.length; index += 150) {
    const { data } = await db.from("ai_news_seen").select("url_hash").in("url_hash", hashes.slice(index, index + 150));
    for (const row of data ?? []) seen.add(String(row.url_hash));
  }
  const ranked = rankCandidates(items.filter((item) => !seen.has(urlHash(item.link))), (recentResult.data ?? []).map((row) => String(row.title)));
  const outletsRead = new Set(items.map((item) => item.outlet.name)).size;
  await log.step(`Read ${items.length} reports from ${outletsRead} outlets; ${ranked.length} new stor${ranked.length === 1 ? "y" : "ies"} worth considering.${ranked.length ? ` Top pick: “${ranked[0].item.title}” (${ranked[0].item.outlet.name}).` : ""}`);
  if (!ranked.length) {
    await log.record({ job: "news", action: "news.select", outcome: "skipped", title: "No new story worth publishing", reason: `Read ${items.length} reports from ${outletsRead} outlets; all were already covered, too old, opinion or sponsored.` });
    await owe(0);
    return `Nothing new from ${outletsRead} outlets.`;
  }

  let published = 0;
  // Stories written this run, published or saved as drafts: both count towards "stories per run".
  let written = 0;
  let stoppedForTime = false;
  await log.step(`Aiming for ${target} ${target === 1 ? "story" : "stories"} this run.`);
  // Look further down the list so a few unreadable pages never leave the run empty.
  const pool = publishingOrder(ranked.slice(0, target * 2 + 6), target);
  for (const candidate of pool) {
    if (written >= target || budget.remaining <= 0) break;
    // One story takes up to about two minutes; stop in time and owe the rest to the next pass.
    if (Date.now() > deadline - 45_000) {
      stoppedForTime = true;
      break;
    }
    const { item } = candidate;
    const sources = [item, ...candidate.corroborating.slice(0, 1)];
    await log.step(`Opening ${sources.map((source) => source.outlet.name).join(" and ")}'s report: “${item.title}”`);
    const pages = await Promise.all(sources.map((source) => fetchPublicText(source.link, { timeoutMs: 9000, maxBytes: 3_000_000, allowHosts: trustedNewsHost })));
    const extracted = pages.map((page) => (page && page.status < 400 ? extractArticle(page.text) : null));
    const reports = sources.map((source, index) => ({
      outlet: source.outlet.name,
      outlet_id: source.outlet.id,
      url: source.link,
      title: source.title,
      published_at: source.publishedAt,
      text: bestReportText([extracted[index]?.text, source.content, extracted[index]?.description, source.summary]).slice(0, index === 0 ? 6000 : 3000),
    })).filter((report) => report.text.length >= 200);
    await db.from("ai_news_seen").upsert({ url_hash: urlHash(item.link), url: item.link, title: item.title, outlet: item.outlet.name, published_at: item.publishedAt, status: "seen" });
    if (!reports.length || reports[0].url !== item.link || reports[0].text.length < 400) {
      const page = pages[0];
      const why = !page ? "its page could not be reached" : page.status >= 400 ? `its page answered HTTP ${page.status} (blocked or removed)` : "its page had no readable report text";
      const feedLength = (item.content ?? item.summary).length;
      await db.from("ai_news_seen").update({ status: "skipped" }).eq("url_hash", urlHash(item.link));
      await log.record({ job: "news", action: "news.skip", outcome: "skipped", title: item.title, reason: `Not enough of ${item.outlet.name}'s report to verify the facts: ${why}, and its feed carried only ${feedLength} characters. Moved on to the next story.`, details: { url: item.link, http_status: page?.status ?? null } });
      continue;
    }

    await log.step(`Writing the story from ${reports.length} report${reports.length > 1 ? "s" : ""} (${reports.reduce((sum, report) => sum + report.text.length, 0).toLocaleString("en-NG")} characters of source text)…`);
    const result = await chatJson(db, {
      job: "news",
      runId: log.runId,
      budget,
      deadline,
      maxAttempts: 4,
      maxTokens: 8000,
      timeoutMs: 110_000,
      validate: validateDraft,
      messages: [
        { role: "system", content: NEWS_SYSTEM_PROMPT },
        { role: "user", content: `EXISTING CATEGORIES: ${JSON.stringify(categories.map(({ slug, label }) => ({ slug, label })))}\nLOCAL PRIORITY: ${candidate.locality.label}\nSOURCE REPORTS:\n${JSON.stringify(anonymousReports(reports))}` },
      ],
    });
    if (!result.ok) {
      await log.record({ job: "news", action: "news.write", outcome: "failed", title: item.title, reason: `None of the chosen free models produced a usable story: ${result.error}`, details: { url: item.link } });
      continue;
    }
    const draft = result.data;
    if (!draft.publish) {
      await db.from("ai_news_seen").update({ status: "skipped" }).eq("url_hash", urlHash(item.link));
      await log.record({ job: "news", action: "news.reject", outcome: "skipped", title: item.title, reason: draft.rejectReason, model: result.model, details: { url: item.link } });
      continue;
    }
    // Owner's rule: the public story never names the outlets it was written from.
    const outletLeft = scrubDraft(draft);
    const problems = [
      ...unsupportedClaims(draft, reports.map((report) => `${report.title}\n${report.text}`).join("\n")),
      ...outletLeft.map((name) => `the story still names the outlet “${name}”`),
    ];
    const publishNow = publish && problems.length === 0;
    await log.step(`Fact check: ${problems.length ? `${problems.length} figure${problems.length > 1 ? "s or quotes" : " or quote"} not found in the sources — saving as a draft for an editor` : "every figure and quote matches the sources"}${publishNow ? " — publishing" : ""}.`);

    let category = categories.find((entry) => entry.slug === draft.categorySlug);
    let categoryNote = "";
    if (!category && draft.newCategory && settings.capabilities.categories) {
      const created = await db.rpc("ai_category_create", { p_label: draft.newCategory, p_description: `Created by the EPE LAWA AI desk for ${draft.newCategory.toLowerCase()} stories.` });
      if (!created.error && created.data) {
        category = { id: String(created.data), slug: "", label: draft.newCategory };
        categoryNote = ` New category “${draft.newCategory}” created.`;
        await log.record({ job: "news", action: "category.create", outcome: "done", title: `Created category “${draft.newCategory}”`, reason: `No existing category fitted “${draft.title}”.`, resourceType: "category", resourceId: String(created.data), model: result.model });
      }
    }
    category ??= fallbackCategory(categories, candidate) ?? categories[0];
    if (!category) {
      await log.record({ job: "news", action: "news.publish", outcome: "failed", title: draft.title, reason: "No active news category exists." });
      break;
    }

    await log.step("Choosing a cover picture (never an outlet's logo)…");
    const coverChoice = await chooseCover({
      candidates: [extracted[0]?.image, item.image, ...(extracted.slice(1).map((page) => page?.image))],
      outlet: item.outlet,
      alt: draft.imageAlt,
      imageQuery: draft.imageQuery || draft.title,
      imagePrompt: draft.imagePrompt,
      seed: item.link,
      step: (message) => log.step(message),
    });
    const cover = coverChoice?.url ?? null;
    const sourceList = reports.map((report) => ({ outlet: report.outlet, title: report.title, url: report.url }));
    const hashtags = withoutOutletTags(cleanHashtags(draft.hashtags, `${draft.title} ${draft.summary}`));
    const saved = await db.rpc("ai_publish_article", {
      p_title: draft.title,
      p_summary: draft.summary,
      p_body: articleBody(draft),
      p_category_id: category.id,
      p_seo_title: draft.seoTitle,
      p_seo_description: draft.seoDescription,
      p_cover_url: cover,
      p_cover_alt: coverChoice ? (coverChoice.alt || draft.imageAlt) : null,
      p_cover_credit: coverChoice?.credit ?? null,
      p_cover_source_url: coverChoice?.sourceUrl ?? null,
      p_cover_license_url: coverChoice?.licenseUrl ?? null,
      p_cover_caption: coverChoice?.caption ?? null,
      p_tags: hashtags,
      p_sources: sourceList,
      p_model: result.model,
      p_publish: publishNow,
    });
    if (saved.error || !saved.data) {
      await log.record({ job: "news", action: "news.publish", outcome: "failed", title: draft.title, reason: `The newsroom refused the article: ${rpcProblem(saved.error)}`, model: result.model, details: { url: item.link } });
      continue;
    }
    const article = saved.data as { id: string; slug: string };
    await db.from("ai_news_seen").update({ status: "used", article_id: article.id }).eq("url_hash", urlHash(item.link));
    const sourceNames = [...new Set(sourceList.map((source) => source.outlet))].join(" and ");
    if (!publishNow) {
      const why = problems.length
        ? `Saved as a draft instead of publishing because the fact check found: ${problems.join("; ")}.`
        : "Autopilot is off, so the story waits for an editor's approval in the Newsroom.";
      written += 1;
      await log.record({ job: "news", action: "news.draft", outcome: "escalated", title: draft.title, reason: why, resourceType: "article", resourceId: article.id, model: result.model, details: { slug: article.slug, sources: sourceList, category: category.label, hashtags, locality: candidate.locality.label, problems } });
      continue;
    }
    published += 1;
    written += 1;
    await log.record({
      job: "news",
      action: "news.publish",
      outcome: "done",
      title: draft.title,
      reason: `Published from ${sourceNames} (${candidate.locality.label} priority, score ${Math.round(candidate.score)}). Category ${category.label}.${categoryNote}${coverChoice ? ({ source: " Cover: the report's own photo (logo checked).", commons: " Cover: a similar freely licensed photo from Wikimedia Commons.", generated: " Cover: an AI-generated illustration." } as const)[coverChoice.kind] : " No picture found or generated; the site's fallback image is shown."}`,
      resourceType: "article",
      resourceId: article.id,
      model: result.model,
      details: { slug: article.slug, sources: sourceList, hashtags, cover, cover_kind: coverChoice?.kind ?? null, locality: candidate.locality.label },
    });

    let breaking = false;
    if (draft.breaking && settings.capabilities.breaking) breaking = await markBreaking(db, ctx, draft, article);
    // Every story the AI publishes notifies news subscribers (within the daily limit), cover photo attached.
    if (settings.capabilities.push) await maybePush(db, ctx, draft, article, { breaking, cover: Boolean(cover) });
  }
  const owed = storiesOwed(target, written, stoppedForTime);
  await owe(owed);
  if (owed) await log.step(`Reached the time limit after ${written} of ${target}; the remaining ${owed} will be written at the next pass in about 5 minutes.`);
  const drafts = written - published;
  const parts = [published ? `Published ${published} ${published === 1 ? "story" : "stories"}` : "", drafts ? `saved ${drafts} draft${drafts === 1 ? "" : "s"} for an editor` : ""].filter(Boolean);
  return `${parts.length ? `${parts.join(" and ")}.` : "No story published this run."}${owed ? ` ${owed} more to come at the next pass.` : ""}`;
}

/** Puts the story in the breaking-news ticker for the configured number of hours. */
async function markBreaking(db: SupabaseClient, ctx: { settings: AiSettings; log: RunLog }, draft: Draft, article: { id: string; slug: string }): Promise<boolean> {
  const hours = ctx.settings.breaking_hours;
  const marked = await db.rpc("ai_mark_breaking", { p_article_id: article.id, p_hours: hours });
  const ok = !marked.error && marked.data === true;
  await ctx.log.record({
    job: "news",
    action: "news.breaking",
    outcome: ok ? "done" : marked.error ? "failed" : "skipped",
    title: draft.title,
    reason: ok
      ? `Flagged as breaking news for ${hours} hour${hours === 1 ? "" : "s"}; it scrolls in the breaking-news ticker until then.`
      : marked.error ? `The breaking flag could not be set: ${rpcProblem(marked.error)}` : "Breaking flag skipped: the ticker already holds the most breaking stories allowed at once.",
    resourceType: "article",
    resourceId: article.id,
  });
  return ok;
}

export function newsPushPayload(draft: Pick<Draft, "title" | "summary">, slug: string, options: { breaking: boolean; cover: boolean }): WebPushPayload {
  const title = `${options.breaking ? "Breaking: " : ""}${draft.title}`;
  return {
    title: title.length > 120 ? `${title.slice(0, 119)}…` : title,
    body: draft.summary.length > 180 ? `${draft.summary.slice(0, 179)}…` : draft.summary,
    kind: "news",
    url: `/news/${slug}`,
    tag: `epelawa:news:${slug}`.slice(0, 120),
    ...(options.cover ? { image: `/news/${slug}/cover` } : {}),
  };
}

async function maybePush(db: SupabaseClient, ctx: { settings: AiSettings; log: RunLog }, draft: Draft, article: { id: string; slug: string }, options: { breaking: boolean; cover: boolean }) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from("ai_activity").select("id", { count: "exact", head: true }).eq("action", "push.send").eq("outcome", "done").gte("created_at", start.toISOString());
  if ((count ?? 0) >= ctx.settings.push_daily_limit) {
    await ctx.log.record({ job: "news", action: "push.send", outcome: "skipped", title: draft.title, reason: `Daily push limit (${ctx.settings.push_daily_limit}) already reached, so readers were not notified again.`, resourceType: "article", resourceId: article.id });
    return;
  }
  if (!pushSenderReady() || !pushCryptoReady()) {
    await ctx.log.record({ job: "news", action: "push.send", outcome: "skipped", title: draft.title, reason: "Push notifications are not configured on the server (VAPID or PUSH_DATA_KEY missing).", resourceType: "article", resourceId: article.id });
    return;
  }
  const outcome = await fanoutPush(db, "news", newsPushPayload(draft, article.slug, options));
  await ctx.log.record({
    job: "news",
    action: "push.send",
    outcome: outcome ? "done" : "failed",
    title: draft.title,
    reason: outcome ? `${options.breaking ? "Breaking story" : "New story"} sent to ${outcome.sent} device${outcome.sent === 1 ? "" : "s"}${options.cover ? " with its cover photo" : ""} (${outcome.failed} failed, ${outcome.gone} expired removed).` : "The device list could not be read.",
    resourceType: "article",
    resourceId: article.id,
    details: outcome ?? {},
  });
}
