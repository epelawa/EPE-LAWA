import { createClient } from "../lib/supabase";

async function editableBody(page: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_pages").select("body").eq("page", page).maybeSingle();
    if (error || !data) return null;
    const body = (data as { body?: string }).body ?? "";
    return body.trim() ? body : null;
  } catch { return null; }
}

export default async function SitePageNote({ page, label }: { page: string; label: string }) {
  const body = await editableBody(page);
  if (!body) return null;
  const blocks = body.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean).slice(0, 20);
  if (blocks.length === 0) return null;
  return (
    <section className="ui-stack-sm" aria-label={label}>
      <h2>{label}</h2>
      {blocks.map((text, index) => <p key={index}>{text}</p>)}
    </section>
  );
}
