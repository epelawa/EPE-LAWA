import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await createClient();
    const [business, corrections, enquiries] = await Promise.all([
      db.from("businesses").select("id", { count: "exact", head: true }).in("status", ["submitted", "reviewing"]).is("deleted_at", null),
      db.from("people_corrections").select("id", { count: "exact", head: true }).eq("state", "open"),
      db.rpc("staff_enquiry_list"),
    ]);
    const openEnquiries = Array.isArray(enquiries.data)
      ? (enquiries.data as { status?: string }[]).filter((row) => row?.status === "open").length
      : 0;
    return NextResponse.json(
      {
        state: "ok",
        queues: {
          submissions: business.error ? null : business.count ?? 0,
          corrections: corrections.error ? null : corrections.count ?? 0,
          enquiries: enquiries.error ? null : openEnquiries,
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ state: "unavailable", queues: { submissions: null, corrections: null, enquiries: null } }, { headers: { "cache-control": "no-store" } });
  }
}
