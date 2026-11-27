import { collectText } from "./news-reading-time";

type Tag = { slug?: string | null; label?: string | null };

/** "#Lagos #Business" — the same hashtag spelling readers see under the story. */
export function shareHashtags(tags: Tag[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...(tags ?? []), { label: "EpeLawa" }]) {
    const word = (tag.label ?? tag.slug ?? "").replace(/^#+/, "").replace(/[^\p{L}\p{N}_]+/gu, "");
    if (word.length < 2 || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    out.push(`#${word}`);
    if (out.length >= 8) break;
  }
  return out;
}

/** A short taste of the story: the summary, else the opening of the body, cut at a word. */
export function shareExcerpt(summary: string | null | undefined, body: unknown, max = 220): string {
  const source = (summary?.trim() || collectText(body)).replace(/\s+/g, " ").trim();
  if (source.length <= max) return source;
  const cut = source.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/u, "")}…`;
}

/** The words that travel with a shared story: headline, a little of the news, the author and the hashtags. */
export function buildShareText({ title, summary, body, author, tags }: { title: string; summary?: string | null; body?: unknown; author?: string | null; tags?: Tag[] | null }): string {
  const excerpt = shareExcerpt(summary, body);
  const lines = [title.trim()];
  if (excerpt && excerpt !== title.trim()) lines.push("", excerpt);
  const byline = author?.trim() ? `By ${author.trim()} · EPE LAWA` : "EPE LAWA";
  lines.push("", byline, shareHashtags(tags).join(" "));
  return lines.join("\n");
}
