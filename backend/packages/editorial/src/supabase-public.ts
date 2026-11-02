/**
 * Experimental server-side adapter for the undeployed editorial SQL prototype.
 * It is not imported by any route. The caller must use a publishable/anon key,
 * never a service credential; do not share a client, token or response cache.
 * Before wiring, review the RPC, authentication, schema, error handling, caching,
 * and test against the real provider and actual deployed CDN.
 */
export type PublicArticle = { title: string; summary: string; body: string };
export type PublicReadResult =
  | { status: 'ok'; article: PublicArticle }
  | { status: 'not_found' }
  | { status: 'unavailable' };

type PublicConfig = { url: string; publishableKey: string };
type Fetcher = typeof fetch;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxResponseBytes = 1024 * 1024;

function isPublishable(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split('.');
    return parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))?.role === 'anon';
  } catch { return false; }
}

function endpoint(config: PublicConfig): URL | null {
  if (!config || typeof config.url !== 'string' || typeof config.publishableKey !== 'string' || !isPublishable(config.publishableKey)) return null;
  try {
    const url = new URL(config.url);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
        url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return new URL('/rest/v1/rpc/editorial_prototype_public_get', url);
  } catch { return null; }
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error('missing response');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0, text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxResponseBytes) throw new Error('oversized response');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}

/** Reads every time; caller must also set no-store on every HTTP/page response. */
export async function readSupabasePublicArticle(config: PublicConfig, id: unknown, fetcher: Fetcher = fetch): Promise<PublicReadResult> {
  if (typeof id !== 'string' || !uuid.test(id)) return { status: 'not_found' };
  const url = endpoint(config);
  if (!url) return { status: 'unavailable' };
  try {
    const response = await fetcher(url, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ target: id }),
    });
    if (!response.ok || !/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type') ?? '')) return { status: 'unavailable' };
    const rows: unknown = JSON.parse(await boundedText(response));
    if (!Array.isArray(rows)) return { status: 'unavailable' };
    if (rows.length === 0) return { status: 'not_found' };
    if (rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object') return { status: 'unavailable' };
    const { title, summary, body } = rows[0];
    if (typeof title !== 'string' || !title.trim() || title.length > 400 ||
        typeof summary !== 'string' || summary.length > 2000 ||
        typeof body !== 'string' || !body.trim() || body.length > 200000) return { status: 'unavailable' };
    // Deliberately discard every field not approved for public use.
    return { status: 'ok', article: { title, summary, body } };
  } catch { return { status: 'unavailable' }; }
}

/** Experimental JSON route response; no route is connected to this helper. */
export function publicArticleResponse(result: PublicReadResult): Response {
  const status = result.status === 'ok' ? 200 : result.status === 'not_found' ? 404 : 503;
  return Response.json(result.status === 'ok' ? result.article : { error: result.status }, {
    status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' },
  });
}
