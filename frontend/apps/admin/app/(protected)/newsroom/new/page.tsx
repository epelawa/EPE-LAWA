import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName, EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading } from "@epelawa/ui";
import { createClient } from "../../../../lib/supabase";
import { createArticle } from "../../../../lib/actions";
import { adminHref } from "../../../../lib/admin-path";

export const metadata: Metadata = {
  title: "Create article draft",
  robots: { index: false, follow: false },
};

type ReferenceOption = { id: string; label?: string; display_name?: string };

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [capabilityResult, categoryResult, authorResult] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
  ]);
  // Effective capabilities include assigned roles; article_create still enforces
  // authoritative authorization for every write.
  const canCreate = !capabilityResult.error && capabilityResult.data === true;
  const categories = (categoryResult.data ?? []) as ReferenceOption[];
  const authors = (authorResult.data ?? []) as ReferenceOption[];
  const accessCheckUnavailable = !!capabilityResult.error;
  const referencesFailed = !!categoryResult.error || !!authorResult.error;

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="Newsroom · New draft" title="Create article draft" description="Drafts stay private until an authorized publisher chooses Publish. Every publication is checked by the database and recorded in the audit log." actions={<Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>} />
      {params.error ? <Notice tone="danger" role="alert">{params.error === "invalid" ? "Add a title, body, byline and category, then try again." : "The draft could not be created. Check your access and try again."}</Notice> : null}
      {accessCheckUnavailable || !canCreate || referencesFailed || categories.length === 0 || authors.length === 0 ? (
        <EmptyPanel title={accessCheckUnavailable ? "Newsroom authorization unavailable" : !canCreate ? "Article creation access required" : "Newsroom setup is incomplete"} description={accessCheckUnavailable ? "Your staff access could not be verified. No draft was created. Refresh and retry; if this continues, ask a system administrator to check the authorization service." : !canCreate ? "This staff account does not have the article.create capability." : referencesFailed ? "Categories and bylines could not be verified. No article was created." : "Add at least one active category and one byline before creating an article."} actions={<div className="ui-actions"><Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>{!accessCheckUnavailable && canCreate && !referencesFailed && (categories.length === 0 || authors.length === 0) ? <Link href={adminHref("/newsroom/settings")} className={buttonClassName("primary")}>Manage categories & bylines</Link> : null}</div>} />
      ) : (
        <Panel>
          <SectionHeading eyebrow="Private until published" title="Article details" description="Complete the required editorial fields. You can refine the draft later." />
          <form action={createArticle} className="ui-stack">
            <div className="ui-field"><label className="label" htmlFor="title">Headline</label><input id="title" name="title" className="input" maxLength={200} required autoFocus /></div>
            <div className="ui-field"><label className="label" htmlFor="summary">Summary</label><textarea id="summary" name="summary" className="input" rows={3} maxLength={1000} /><p className="ui-meta">Up to 1,000 characters; shown with the article listing.</p></div>
            <div className="ui-field"><label className="label" htmlFor="body">Article body</label><textarea id="body" name="body" className="input" rows={14} maxLength={100000} required placeholder="Write plain text. Separate paragraphs with a blank line." /><p className="ui-meta">Content is stored as structured text, not raw HTML.</p></div>
            <div className="ui-form-grid">
              <div className="ui-field"><label className="label" htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" className="input" required defaultValue=""><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>
              <div className="ui-field"><label className="label" htmlFor="authorId">Byline</label><select id="authorId" name="authorId" className="input" required defaultValue=""><option value="" disabled>Select an author</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.display_name}</option>)}</select></div>
            </div>
            <div className="ui-form-grid">
              <div className="ui-field"><label className="label" htmlFor="seoTitle">Search title (optional)</label><input id="seoTitle" name="seoTitle" className="input" maxLength={70} /></div>
              <div className="ui-field"><label className="label" htmlFor="seoDescription">Search description (optional)</label><input id="seoDescription" name="seoDescription" className="input" maxLength={200} /></div>
            </div>
            <div className="ui-actions"><Link href={adminHref("/newsroom")} className={buttonClassName("ghost")}>Cancel</Link><button className={buttonClassName("primary")} type="submit">Create private draft</button></div>
          </form>
        </Panel>
      )}
    </PageFrame>
  );
}
