import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatJson, type Budget } from "../openrouter";
import { fetchPublicText } from "../safe-fetch";
import { extractArticle, NEWS_OUTLETS, trustedNewsHost } from "../news-sources";
import { chooseCover } from "../news-images";
import { rpcProblem, type RunLog } from "../activity";
import { articleBody, bestReportText, cleanHashtags, scrubDraft, unsupportedClaims, validateDraft, withoutOutletTags, NEWS_SYSTEM_PROMPT } from "./news";
import { storyPlainText } from "./news-reedit-rules";

/**
 * Re-edits stories the AI desk published before the current rules (owner,
 * turn 25): a complete rewrite in new words, no outlet names or branding, and
 * a fresh cover choice (source photo with the logo check, a free photo, an AI
 * illustration, or none so the site's fallback shows). Each story becomes a
 * new version of the same article and keeps its original posting time.
 */

type Meta = { article_id: string; sources: { url?: string; title?: string; outlet?: string }[] | null };
type Version = { title: string; summary: string | null; body: unknown; category_id: string; cover_url: string | null };

function outletsFor(urls: string[]) {
  const hosts = urls.map((url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } });
  return NEWS_OUTLETS.filter((outlet) => outlet.domains.some((domain) => hosts.some((host) => host === domain.replace(/^www\./, "") || host.endsWith(`.${domain.replace(/^www\./, "")}`))));
}

const REEDIT_NOTE = `This is a RE-EDIT of a story EPE LAWA already published. Write it again from scratch under the rules above: a new headline, new opening, new structure, new words. Keep to the same news event and only the facts in the SOURCE REPORTS (one of them may be the earlier EPE LAWA version). Remove any mention of the outlets the facts came from.`;

export async function unrevisedCount(db: SupabaseClient): Promise<number> {
  const { count } = await db.from("ai_article_meta").select("article_id", { count: "exact", head: true }).is("revised_at", null);
  return count ?? 0;
}

export async function runNewsReeditJob(db: SupabaseClient, ctx: { log: RunLog; budget: Budget; deadline: number; publish: boolean; limit?: number }): Promise<string> {
  const { log, budget, deadline, publish } = ctx;
  const { data, error } = await db.from("ai_article_meta").select("article_id,sources").is("revised_at", null).order("created_at", { ascending: false }).limit(Math.max(1, Math.min(20, ctx.limit ?? 8)));
  if (error) return "AI stories could not be read.";
  const queue = (data ?? []) as Meta[];
  if (!queue.length) return "Every AI story has already been re-edited.";
  await log.step(`Re-editing ${queue.length} earlier AI ${queue.length === 1 ? "story" : "stories"} under the current rules (no outlet names or logos, new cover check)…`);
  let republished = 0, drafts = 0, skipped = 0;
  for (const meta of queue) {
    if (Date.now() > deadline - 60_000 || budget.remaining <= 0 || budget.stopped) break;
    const article = await db.from("articles").select("id,slug,current_version_id,published_version_id").eq("id", meta.article_id).maybeSingle();
    const versionId = article.data?.published_version_id ?? article.data?.current_version_id;
    if (!article.data || !versionId) {
      await db.from("ai_article_meta").update({ revised_at: new Date().toISOString(), revise_note: "Skipped: the article no longer exists." }).eq("article_id", meta.article_id);
      skipped += 1;
      continue;
    }
    const versionResult = await db.from("article_versions").select("title,summary,body,category_id,cover_url").eq("id", versionId).maybeSingle();
    const version = versionResult.data as Version | null;
    if (!version) { skipped += 1; continue; }
    // Draft-only stories that an editor is looking at are left alone.
    if (!article.data.published_version_id) {
      await db.from("ai_article_meta").update({ revised_at: new Date().toISOString(), revise_note: "Skipped: not published (an editor has the draft)." }).eq("article_id", meta.article_id);
      skipped += 1;
      continue;
    }
    await log.step(`Re-editing “${version.title}”…`);
    const sources = (meta.sources ?? []).filter((source) => typeof source.url === "string").slice(0, 2);
    const pages = await Promise.all(sources.map((source) => fetchPublicText(source.url!, { timeoutMs: 9000, maxBytes: 3_000_000, allowHosts: trustedNewsHost })));
    const extracted = pages.map((page) => (page && page.status < 400 ? extractArticle(page.text) : null));
    const earlier = storyPlainText(version.body);
    const reports = [
      ...sources.map((source, index) => ({ title: source.title ?? "", published_at: null, text: bestReportText([extracted[index]?.text, extracted[index]?.description]).slice(0, index === 0 ? 6000 : 3000) })),
      { title: version.title, published_at: null, text: `${version.summary ?? ""}\n${earlier}`.slice(0, 6000) },
    ].filter((report) => report.text.length >= 200);
    if (!reports.length) {
      await db.from("ai_article_meta").update({ revised_at: new Date().toISOString(), revise_note: "Skipped: no readable text to rewrite from." }).eq("article_id", meta.article_id);
      skipped += 1;
      continue;
    }
    const result = await chatJson(db, {
      job: "news",
      runId: log.runId,
      budget,
      deadline,
      maxAttempts: 3,
      maxTokens: 8000,
      timeoutMs: 110_000,
      validate: validateDraft,
      messages: [
        { role: "system", content: `${NEWS_SYSTEM_PROMPT}\n${REEDIT_NOTE}` },
        { role: "user", content: `EXISTING CATEGORIES: []\nSOURCE REPORTS:\n${JSON.stringify(reports.map((report, index) => ({ report: `Report ${index + 1}`, ...report })))}` },
      ],
    });
    if (!result.ok) {
      await log.record({ job: "news", action: "news.reedit", outcome: "failed", title: version.title, reason: `No free model produced a usable re-edit: ${result.error}`, resourceType: "article", resourceId: meta.article_id });
      continue;
    }
    const draft = result.data;
    if (!draft.publish) {
      await db.from("ai_article_meta").update({ revised_at: new Date().toISOString(), revise_note: `Kept as it was: ${draft.rejectReason}`.slice(0, 500) }).eq("article_id", meta.article_id);
      await log.record({ job: "news", action: "news.reedit", outcome: "escalated", title: version.title, reason: `The model would not rewrite it: ${draft.rejectReason}. The story was left unchanged for an editor to check.`, resourceType: "article", resourceId: meta.article_id, model: result.model });
      drafts += 1;
      continue;
    }
    const outletLeft = scrubDraft(draft);
    const allSource = reports.map((report) => `${report.title}\n${report.text}`).join("\n");
    const problems = [...unsupportedClaims(draft, allSource), ...outletLeft.map((name) => `the story still names the outlet “${name}”`)];
    const publishNow = publish && problems.length === 0;
    const coverChoice = await chooseCover({
      candidates: [extracted[0]?.image, extracted[1]?.image, version.cover_url],
      outlet: outletsFor(sources.map((source) => source.url!)),
      alt: draft.imageAlt,
      imageQuery: draft.imageQuery || draft.title,
      imagePrompt: draft.imagePrompt,
      seed: `${meta.article_id}:reedit`,
      step: (message) => log.step(message),
    });
    const hashtags = withoutOutletTags(cleanHashtags(draft.hashtags, `${draft.title} ${draft.summary}`));
    const saved = await db.rpc("ai_revise_article", {
      p_article_id: meta.article_id,
      p_title: draft.title,
      p_summary: draft.summary,
      p_body: articleBody(draft),
      p_category_id: version.category_id,
      p_seo_title: draft.seoTitle,
      p_seo_description: draft.seoDescription,
      p_cover_url: coverChoice?.url ?? null,
      p_cover_alt: coverChoice ? (coverChoice.alt || draft.imageAlt) : null,
      p_cover_credit: coverChoice?.credit ?? null,
      p_cover_source_url: coverChoice?.sourceUrl ?? null,
      p_cover_license_url: coverChoice?.licenseUrl ?? null,
      p_cover_caption: coverChoice?.caption ?? null,
      p_tags: hashtags,
      p_model: result.model,
      p_publish: publishNow,
    });
    if (saved.error) {
      // Marked as handled so a story the newsroom cannot revise is not retried every pass.
      await db.from("ai_article_meta").update({ revised_at: new Date().toISOString(), revise_note: `Not re-edited: ${rpcProblem(saved.error)}`.slice(0, 500) }).eq("article_id", meta.article_id);
      await log.record({ job: "news", action: "news.reedit", outcome: "failed", title: version.title, reason: `The newsroom refused the re-edit: ${rpcProblem(saved.error)}`, resourceType: "article", resourceId: meta.article_id, model: result.model });
      continue;
    }
    const coverWord = coverChoice ? ({ source: "the report's own photo (logo checked)", commons: "a freely licensed photo", generated: "an AI-generated illustration" } as const)[coverChoice.kind] : "none (the site's fallback image shows)";
    if (publishNow) {
      republished += 1;
      await log.record({ job: "news", action: "news.reedit", outcome: "done", title: draft.title, reason: `Re-edited “${version.title}” under the current rules and republished it at its original time. Cover: ${coverWord}.`, resourceType: "article", resourceId: meta.article_id, model: result.model, details: { previous_title: version.title, cover_kind: coverChoice?.kind ?? null } });
    } else {
      drafts += 1;
      await log.record({ job: "news", action: "news.reedit", outcome: "escalated", title: draft.title, reason: problems.length ? `Re-edit saved as a draft (the published story is unchanged) because: ${problems.join("; ")}.` : "Autopilot is off, so the re-edit waits for an editor; the published story is unchanged.", resourceType: "article", resourceId: meta.article_id, model: result.model, details: { previous_title: version.title, problems } });
    }
  }
  const left = await unrevisedCount(db);
  return `Re-edited ${republished} AI ${republished === 1 ? "story" : "stories"}${drafts ? `, ${drafts} sent to an editor` : ""}${skipped ? `, ${skipped} skipped` : ""}.${left ? ` ${left} still to re-edit.` : " All earlier AI stories are now re-edited."}`;
}
