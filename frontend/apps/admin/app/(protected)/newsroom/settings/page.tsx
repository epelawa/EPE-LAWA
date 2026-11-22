import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, SubmitButton, buttonClassName } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import { saveNewsroomByline, saveNewsroomCategory } from "../../../../lib/newsroom-settings-actions";
export const metadata: Metadata = { title: "Newsroom settings", robots: { index: false, follow: false } };
type Category = { id: string; slug: string; label: string; description: string | null; sort_order: number; is_active: boolean };
type Byline = { id: string; slug: string; display_name: string; bio: string | null; photo_key: string | null };
const notices: Record<string, string> = {
  saved: "Changes saved.", invalid: "Check the required fields and allowed formats, then try again.",
  conflict: "That slug is already in use. Choose a different slug.", failed: "Changes could not be saved. Confirm your staff access and try again.",
};
function ResultNotice({ value, label }: { value?: string; label: string }) {
  if (!value || !notices[value]) return null;
  return <Notice tone={value === "saved" ? "success" : "danger"} role={value === "saved" ? "status" : "alert"}>{label}: {notices[value]}</Notice>;
}
export default async function NewsroomSettingsPage({ searchParams }: { searchParams: Promise<{ category?: string; byline?: string }> }) {
  const params = await searchParams;
  const supabase = await createStaffClient();
  const [capability, categoryResult, bylineResult] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "article.publish" }),
    supabase.from("categories").select("id,slug,label,description,sort_order,is_active").order("sort_order").order("label").limit(200),
    supabase.from("authors").select("id,slug,display_name,bio,photo_key").order("display_name").limit(200),
  ]);
  const authorized = !capability.error && capability.data === true;
  const loadFailed = !!categoryResult.error || !!bylineResult.error;
  const categories = (categoryResult.data ?? []) as Category[];
  const bylines = (bylineResult.data ?? []) as Byline[];
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Newsroom · Editorial setup" title="Categories & bylines" description="Maintain the labels and credited names used on articles. Changes are audited; records are never deleted." actions={<Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>} />
    <ResultNotice value={params.category} label="Category" /><ResultNotice value={params.byline} label="Byline" />
    {!authorized ? <EmptyPanel title={capability.error ? "Authorization unavailable" : "Article publishing access required"} description={capability.error ? "Staff access could not be verified. No changes are available." : "This staff account needs the article.publish capability to manage newsroom setup."} /> : loadFailed ? <EmptyPanel title="Settings could not be loaded" description="Category and byline data could not be verified. Refresh and retry; no changes were made." /> : <>
      <section className="ui-stack-sm" aria-labelledby="category-heading"><SectionHeading eyebrow={`${categories.length} categories`} title="Categories" id="category-heading" description="Inactive categories stay attached to past articles but are unavailable for new drafts." />
        <Panel className="ui-stack-sm"><h3>Add a category</h3><CategoryForm action={saveNewsroomCategory} /></Panel>
        {categories.length ? <div className="ui-stack-sm">{categories.map((category) => <Panel key={category.id} className="ui-stack-sm"><div className="ui-page-intro"><div><h3>{category.label}</h3><p className="ui-meta">/{category.slug} · sort {category.sort_order} · {category.is_active ? "Active" : "Inactive"}</p></div></div><CategoryForm action={saveNewsroomCategory} item={category} /></Panel>)}</div> : <EmptyPanel title="No categories yet" description="Add the first category here; existing article history will not be changed." />}
      </section>
      <section className="ui-stack-sm" aria-labelledby="byline-heading"><SectionHeading eyebrow={`${bylines.length} bylines`} title="Bylines" id="byline-heading" description="Edit a credited name in place. Existing article versions remain intact." />
        <Panel className="ui-stack-sm"><h3>Add a byline</h3><BylineForm action={saveNewsroomByline} /></Panel>
        {bylines.length ? <div className="ui-stack-sm">{bylines.map((byline) => <Panel key={byline.id} className="ui-stack-sm"><div><h3>{byline.display_name}</h3><p className="ui-meta">/{byline.slug}</p></div><BylineForm action={saveNewsroomByline} item={byline} /></Panel>)}</div> : <EmptyPanel title="No bylines yet" description="Add the first byline here. No article content is created or changed." />}
      </section>
    </>}
  </PageFrame>;
}
function CategoryForm({ action, item }: { action: (formData: FormData) => Promise<void>; item?: Category }) {
  return <form action={action} className="ui-stack-sm"><input type="hidden" name="id" value={item?.id ?? ""} /><div className="ui-form-grid"><div className="ui-field"><label className="label" htmlFor={`cat-label-${item?.id ?? "new"}`}>Name</label><input className="input" id={`cat-label-${item?.id ?? "new"}`} name="label" required maxLength={60} defaultValue={item?.label ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`cat-slug-${item?.id ?? "new"}`}>Slug</label><input className="input" id={`cat-slug-${item?.id ?? "new"}`} name="slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers, and single hyphens." defaultValue={item?.slug ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`cat-desc-${item?.id ?? "new"}`}>Description (optional)</label><input className="input" id={`cat-desc-${item?.id ?? "new"}`} name="description" maxLength={500} defaultValue={item?.description ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`cat-order-${item?.id ?? "new"}`}>Display order</label><input className="input" id={`cat-order-${item?.id ?? "new"}`} name="sortOrder" type="number" step="1" required defaultValue={item?.sort_order ?? 0} /></div></div><label className="ui-check"><input type="checkbox" name="isActive" defaultChecked={item?.is_active ?? true} /> Active for new articles</label><div className="ui-actions"><SubmitButton pendingLabel="Saving…" className={buttonClassName("primary")}>{item ? "Save category" : "Add category"}</SubmitButton></div></form>;
}
function BylineForm({ action, item }: { action: (formData: FormData) => Promise<void>; item?: Byline }) {
  return <form action={action} className="ui-stack-sm"><input type="hidden" name="id" value={item?.id ?? ""} /><div className="ui-form-grid"><div className="ui-field"><label className="label" htmlFor={`byline-name-${item?.id ?? "new"}`}>Display name</label><input className="input" id={`byline-name-${item?.id ?? "new"}`} name="displayName" required maxLength={120} defaultValue={item?.display_name ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`byline-slug-${item?.id ?? "new"}`}>Slug</label><input className="input" id={`byline-slug-${item?.id ?? "new"}`} name="slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers, and single hyphens." defaultValue={item?.slug ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`byline-bio-${item?.id ?? "new"}`}>Bio (optional)</label><textarea className="input" id={`byline-bio-${item?.id ?? "new"}`} name="bio" rows={3} maxLength={2000} defaultValue={item?.bio ?? ""} /></div><div className="ui-field"><label className="label" htmlFor={`byline-photo-${item?.id ?? "new"}`}>Photo key (optional)</label><input className="input" id={`byline-photo-${item?.id ?? "new"}`} name="photoKey" maxLength={500} defaultValue={item?.photo_key ?? ""} /></div></div><div className="ui-actions"><SubmitButton pendingLabel="Saving…" className={buttonClassName("primary")}>{item ? "Save byline" : "Add byline"}</SubmitButton></div></form>;
}
