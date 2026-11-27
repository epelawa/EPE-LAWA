/** Pure helpers for re-editing published AI stories (unit-tested). */

type Node = { type?: string; text?: string; content?: Node[]; marks?: { type?: string }[] };

const FOOTER = /^(written by the epe lawa ai desk|sources?:|source reports?:)/i;

/**
 * The readable text of a stored story (TipTap JSON), one paragraph per line,
 * without the AI-desk footer or an old "Sources" list.
 */
export function storyPlainText(body: unknown): string {
  const doc = body as Node | null;
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.content)) return "";
  const lines: string[] = [];
  let inSources = false;
  const textOf = (node: Node): string => (typeof node.text === "string" ? node.text : (node.content ?? []).map(textOf).join(""));
  for (const block of doc.content) {
    const text = textOf(block).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (block.type === "heading" && /^sources?$/i.test(text)) { inSources = true; continue; }
    if (inSources && (block.type === "bulletList" || block.type === "orderedList")) continue;
    if (block.type === "heading") inSources = false;
    if (FOOTER.test(text)) continue;
    lines.push(text);
  }
  return lines.join("\n");
}
