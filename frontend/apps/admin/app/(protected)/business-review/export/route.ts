import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/** CSV of the current business review queue, gated to the business.review capability. */
export async function GET(): Promise<Response> {
  const db = await createClient();
  const { data: allowed, error: ge } = await db.rpc("has_capability", { p_capability: "business.review" });
  if (ge || allowed !== true) return new Response("Forbidden", { status: 403 });

  const [{ data, error }, { data: cats }] = await Promise.all([
    db.from("businesses")
      .select("name,category_id,description,area,address,landmark,phone,whatsapp,email,website,status,created_at,hours")
      .in("status", ["submitted", "reviewing"]).is("deleted_at", null).order("created_at").limit(1000),
    db.from("business_categories").select("id,label").limit(100),
  ]);
  if (error) return new Response("Queue unavailable", { status: 503 });
  const labels = new Map((cats ?? []).map((category) => [category.id, category.label]));

  const header = ["Business name", "Category", "Status", "Description", "Area", "Address", "Landmark", "Phone", "WhatsApp", "Email", "Website", "Opening hours", "Received"];
  const rows = (data ?? []).map((business) => [
    business.name,
    labels.get(business.category_id) ?? "",
    business.status,
    business.description ?? "",
    business.area ?? "",
    business.address ?? "",
    business.landmark ?? "",
    business.phone ?? "",
    business.whatsapp ?? "",
    business.email ?? "",
    business.website ?? "",
    business.hours && typeof business.hours === "object" && !Array.isArray(business.hours)
      ? Object.entries(business.hours as Record<string, unknown>).map(([day, range]) => `${day}: ${String(range)}`).join("; ")
      : "",
    business.created_at,
  ]);

  const body = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(`\ufeff${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="business-review-queue.csv"',
      "Cache-Control": "no-store",
    },
  });
}
