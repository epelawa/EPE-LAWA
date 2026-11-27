import { createClient } from "../../../../lib/supabase";
import { publishedNewsCover } from "../../../../lib/published-news-cover";
import { fetchPublicBytes } from "../../../../lib/ai/safe-fetch";

/**
 * The cover image of one published story, served from this site so the Share
 * button can attach the real picture. News outlets do not allow other sites'
 * browsers to download their photos (no CORS), which is why sharing fell back to
 * a bare link for AI-written stories with an outlet's cover.
 *
 * Not an open proxy: the only URL ever fetched is the cover already stored on a
 * published article, through the public-address-only fetcher, and only a real
 * JPEG/PNG/WebP/GIF of at most 8 MB is passed on.
 */

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

function imageType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (bytes.subarray(0, 6).toString("latin1") === "GIF87a" || bytes.subarray(0, 6).toString("latin1") === "GIF89a") return "image/gif";
  return null;
}

function notFound(): Response {
  return new Response("Cover not available", { status: 404, headers: { "cache-control": "public, max-age=60", "content-type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  if (!slug || slug.length > 200) return notFound();
  let coverUrl: string | undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("published_articles").select("cover_url,cover_alt").eq("slug", slug).maybeSingle();
    coverUrl = data ? publishedNewsCover(data)?.url : undefined;
  } catch {
    return notFound();
  }
  if (!coverUrl) return notFound();
  const fetched = await fetchPublicBytes(coverUrl, { timeoutMs: 8000, maxBytes: MAX_BYTES, accept: "image/jpeg,image/png,image/webp,image/gif;q=0.9,*/*;q=0.1" });
  if (!fetched || fetched.status !== 200 || fetched.truncated) return notFound();
  const type = imageType(fetched.bytes);
  if (!type) return notFound();
  return new Response(new Uint8Array(fetched.bytes), {
    status: 200,
    headers: {
      "content-type": type,
      "content-length": String(fetched.bytes.length),
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "content-disposition": `inline; filename="epe-lawa-cover.${type.split("/")[1].replace("jpeg", "jpg")}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
