import { createClient } from "../lib/supabase";
import { StructuredText } from "../lib/structured-text";

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
  return (
    <section className="ui-stack-sm ui-prose" aria-label={label}>
      <h2>{label}</h2>
      <StructuredText text={body} maxBlocks={20} />
    </section>
  );
}
