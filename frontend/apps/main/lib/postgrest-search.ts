const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;
const MAX_SEARCH_TERM_LENGTH = 200;

function cleanSearchTerm(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}

/** Escape PostgreSQL LIKE wildcards so a search term is matched literally. */
export function escapePostgrestLikeTerm(value: string): string {
  return cleanSearchTerm(value).replace(/[\\%_*]/g, "\\$&");
}

/** Build a PostgREST OR expression with fixed column identifiers and quoted values. */
export function buildOrIlikeContains(columns: readonly string[], rawTerm: string): string {
  const term = cleanSearchTerm(rawTerm);
  if (!term || columns.length === 0) return "";
  if (columns.some((column) => !IDENTIFIER.test(column))) {
    throw new TypeError("PostgREST search columns must be fixed identifiers.");
  }

  const pattern = `%${escapePostgrestLikeTerm(term)}%`;
  const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}
