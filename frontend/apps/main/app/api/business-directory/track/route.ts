import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = new Set(["call", "whatsapp", "website", "directions"]);

/**
 * Records an outbound contact click on a published business listing.
 * The database decides whether the slug is published; the payload carries no
 * personal data and the row is an aggregate counter per business, kind and day.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const slug = typeof record.slug === "string" ? record.slug : "";
  const kind = typeof record.kind === "string" ? record.kind : "";
  if (!SLUG.test(slug) || !KINDS.has(kind)) {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("business_track_click", { p_slug: slug, p_kind: kind });
    if (error) {
      console.error("business_track_click failed", { code: error.code });
      return NextResponse.json({ recorded: false }, { status: 503 });
    }
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 503 });
  }
}
