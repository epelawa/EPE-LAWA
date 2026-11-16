import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIEWER_KEY = /^[a-f0-9]{32}$/;

/**
 * Records a real, de-duplicated daily view for a published article.
 * The browser only supplies a random local viewer key; the database decides
 * whether the story is published and whether the pair was already counted.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const articleId = typeof record.articleId === "string" ? record.articleId : "";
  const viewerKey = typeof record.viewerKey === "string" ? record.viewerKey : "";
  if (!UUID.test(articleId) || !VIEWER_KEY.test(viewerKey)) {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_article_view", {
      p_article_id: articleId,
      p_viewer_key: viewerKey,
    });
    if (error) {
      console.error("record_article_view failed", { code: error.code });
      return NextResponse.json({ recorded: false }, { status: 503 });
    }
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 503 });
  }
}
