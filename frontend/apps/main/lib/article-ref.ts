/**
 * Article IDs for staff (owner, turn 26): the newsroom shows each article's
 * short ID (the first 8 characters of its UUID) and accepts a short or full ID
 * in its search box and in the admin AI chat. Never shown to the public.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function shortArticleId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** A typed ID → the UUID range it covers ("1a2b3c4d", "#1A2B3C4D", "ID 1a2b3c4d" or a full UUID). Null when it is not an ID. */
export function articleIdRange(input: string): { from: string; to: string; exact: boolean } | null {
  const raw = input.trim().toLowerCase().replace(/^(article\s+)?(id[\s:#-]*)?#?/, "");
  if (UUID.test(raw)) return { from: raw, to: raw, exact: true };
  const hex = raw.replace(/-/g, "");
  if (!/^[0-9a-f]{6,32}$/.test(hex)) return null;
  const format = (value: string) => `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  return { from: format(hex.padEnd(32, "0")), to: format(hex.padEnd(32, "f")), exact: hex.length === 32 };
}

/** Every article ID mentioned in a message (short or full). */
export function articleIdsIn(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)) found.add(match[0].toLowerCase());
  const withoutFull = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, " ");
  for (const match of withoutFull.matchAll(/(?:^|[^0-9a-z-])#?([0-9a-f]{8})(?![0-9a-z-])/gi)) found.add(match[1].toLowerCase());
  return [...found];
}

/** Every support ticket number mentioned in a message (EPE-XXXXXX). */
export function ticketRefsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\bEPE-[A-Z0-9]{6}\b/gi)].map((match) => match[0].toUpperCase()))];
}
