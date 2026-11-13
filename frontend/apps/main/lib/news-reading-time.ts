function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const node = value as Record<string, unknown>;
  const ownText = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content) ? collectText(node.content) : "";
  return [ownText, children].filter(Boolean).join(" ");
}

/** Estimate minutes at a conservative 220 words/minute, based only on article body text. */
export function estimateReadMinutes(body: unknown): number {
  const text = collectText(body).trim();
  const words = text ? text.split(/\s+/u).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / 220));
}
