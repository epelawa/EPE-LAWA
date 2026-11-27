import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatJson, type Budget } from "../openrouter";
import { fetchPublicText } from "../safe-fetch";
import { extractArticle, localityScore, NEWS_OUTLETS, newsworthy, parseFeed, similarity, titleTokens, trustedNewsHost, type FeedItem } from "../news-sources";
import { normalizeExternalNewsCoverUrl } from "../../news-cover-url.mjs";
import { suggestNewsHashtags } from "../../../../admin/lib/news-hashtags";
import { fanoutPush } from "../../push-fanout";
import { pushSenderReady } from "../../web-push-send";
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
  push: boolean;
};

function text(value: unknown, min: number, max: number): string | null {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

export function validateDraft(value: unknown): Draft | null {
  const row = value as Record<string, unknown>;
  if (!row || typeof row !== "object") return null;
  const publish = row.publish === true;
  const rejectReason = typeof row.reject_reason === "string" ? row.reject_reason.slice(0, 500) : "";
  if (!publish) return { publish, rejectReason: rejectReason || "The model judged the sources unsuitable.", title: "", summary: "", blocks: [], categorySlug: null, newCategory: null, hashtags: [], seoTitle: "", seoDescription: "", imageAlt: "", push: false };
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
    push: row.push === true,
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

export function articleBody(draft: Draft, sources: { outlet: string; title: string; url: string }[]) {
  const content: unknown[] = draft.blocks.map((block) =>
    block.type === "h2"
      ? { type: "heading", attrs: { level: 2 }, content: [textNode(block.text)] }
      : block.type === "quote"
        ? { type: "blockquote", content: [{ type: "paragraph", content: [textNode(block.text)] }] }
        : { type: "paragraph", content: [textNode(block.text)] },
  );
  content.push({ type: "heading", attrs: { level: 3 }, content: [textNode("Sources")] });
  content.push({
    type: "bulletList",
    content: sources.map((source) => ({ type: "listItem", content: [{ type: "paragraph", content: [textNode(`${source.outlet}: `), textNode(source.title, source.url)] }] })),
  });
  content.push({
    type: "paragraph",
    content: [{ type: "text", text: "This report was compiled by the EPE LAWA AI desk from the reporting credited above and published by the Epe Lawa Editorial Desk. Spotted an error? Use the correction form below.", marks: [{ type: "italic" }] }],
  });
  return { type: "doc", content };
}

const SYSTEM = `You are the news writer for EPE LAWA, a community newsroom for Epe Division, Lagos State, Nigeria.
You rewrite verified reports from established newsrooms into an original, neutral EPE LAWA news story.
Hard rules:
- Use ONLY facts stated in the SOURCE REPORTS. Never add names, numbers, dates, places, quotes or background that are not in them.
- Attribute claims to the outlet ("according to Punch", "Channels Television reported").
- Write in your own words; do not copy sentences, except short direct quotes copied exactly from a source and marked with quotation marks.
- Plain British English, clear for Nigerian readers. No speculation, opinion, sensationalism or clickbait.
- If the sources are thin, contradictory, opinion, sponsored, graphic, defamatory, about a minor, or not real news, set publish to false and explain why in reject_reason.
- Say why it matters to readers in Epe, Lagos or Nigeria when the sources support it; never invent local angles.
Return ONLY a JSON object:
{"publish":true|false,"reject_reason":"","title":"max 110 chars","summary":"1-2 sentences, max 280 chars","body":[{"type":"p"|"h2"|"quote","text":"..."}],"category_slug":"one existing slug or null","new_category":"short label only if no existing category fits, else null","hashtags":["4 to 8 CamelCase hashtags without #"],"seo_title":"max 65 chars","seo_description":"max 155 chars","image_alt":"describes the lead photo of the source report, max 150 chars","push":true only for major breaking news that matters to Epe or Lagos readers}
Body: 5 to 10 paragraphs, optional short h2 subheadings. Do not include a sources list; it is added automatically.`;

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
  const pool = ranked.slice(0, target * 2 + 6);
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
        { role: "system", content: SYSTEM },
        { role: "user", content: `EXISTING CATEGORIES: ${JSON.stringify(categories.map(({ slug, label }) => ({ slug, label })))}\nLOCAL PRIORITY: ${candidate.locality.label}\nSOURCE REPORTS:\n${JSON.stringify(reports)}` },
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
    const problems = unsupportedClaims(draft, reports.map((report) => `${report.title}\n${report.text}`).join("\n"));
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

    const cover = normalizeExternalNewsCoverUrl(extracted[0]?.image ?? item.image ?? "");
    const sourceList = reports.map((report) => ({ outlet: report.outlet, title: report.title, url: report.url }));
    const hashtags = cleanHashtags(draft.hashtags, `${draft.title} ${draft.summary}`);
    const saved = await db.rpc("ai_publish_article", {
      p_title: draft.title,
      p_summary: draft.summary,
      p_body: articleBody(draft, sourceList),
      p_category_id: category.id,
      p_seo_title: draft.seoTitle,
      p_seo_description: draft.seoDescription,
      p_cover_url: cover,
      p_cover_alt: cover ? draft.imageAlt : null,
      p_cover_credit: cover ? item.outlet.name : null,
      p_cover_source_url: cover ? item.link : null,
      p_cover_license_url: cover ? item.link : null,
      p_cover_caption: null,
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
      reason: `Published from ${sourceNames} (${candidate.locality.label} priority, score ${Math.round(candidate.score)}). Category ${category.label}.${categoryNote}${cover ? ` Cover photo from ${item.outlet.name}.` : " No source photo was available."}`,
      resourceType: "article",
      resourceId: article.id,
      model: result.model,
      details: { slug: article.slug, sources: sourceList, hashtags, cover, locality: candidate.locality.label },
    });

    if (draft.push && settings.capabilities.push) await maybePush(db, ctx, draft, article);
  }
  const owed = storiesOwed(target, written, stoppedForTime);
  await owe(owed);
  if (owed) await log.step(`Reached the time limit after ${written} of ${target}; the remaining ${owed} will be written at the next pass in about 5 minutes.`);
  const drafts = written - published;
  const parts = [published ? `Published ${published} ${published === 1 ? "story" : "stories"}` : "", drafts ? `saved ${drafts} draft${drafts === 1 ? "" : "s"} for an editor` : ""].filter(Boolean);
  return `${parts.length ? `${parts.join(" and ")}.` : "No story published this run."}${owed ? ` ${owed} more to come at the next pass.` : ""}`;
}

async function maybePush(db: SupabaseClient, ctx: { settings: AiSettings; log: RunLog }, draft: Draft, article: { id: string; slug: string }) {
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
  const outcome = await fanoutPush(db, "news", { title: draft.title.slice(0, 120), body: draft.summary.slice(0, 180), kind: "news", url: `/news/${article.slug}` });
  await ctx.log.record({
    job: "news",
    action: "push.send",
    outcome: outcome ? "done" : "failed",
    title: draft.title,
    reason: outcome ? `Breaking story sent to ${outcome.sent} devices (${outcome.failed} failed, ${outcome.gone} expired removed).` : "The device list could not be read.",
    resourceType: "article",
    resourceId: article.id,
    details: outcome ?? {},
  });
}
