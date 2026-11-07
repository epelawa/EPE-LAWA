import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@epelawa/ui";
import { createClient } from "../../../../lib/supabase";
import { createArticle } from "../../../../lib/actions";

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
  const [capability, categoryResult, authorResult] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
  ]);
  const canCreate = capability.data === true;
  const categories = (categoryResult.data ?? []) as ReferenceOption[];
  const authors = (authorResult.data ?? []) as ReferenceOption[];
  const referencesFailed = !!categoryResult.error || !!authorResult.error || !!capability.error;

  return (
    <div className="site-main">
      <div className="ep-container">
        <header className="page-header">
          <p className="page-header__eyebrow">Newsroom</p>
          <h1 className="page-header__title">Create article draft</h1>
          <p className="page-header__lede">
            Drafts stay private until an authorized publisher chooses Publish. Every publication is
            checked by the database and recorded in the audit log.
          </p>
        </header>

        {params.error ? (
          <div className="admin-alert" role="alert">
            {params.error === "invalid"
              ? "Add a title, body, byline and category, then try again."
              : "The draft could not be created. Check your access and try again."}
          </div>
        ) : null}

        {!canCreate || referencesFailed || categories.length === 0 || authors.length === 0 ? (
          <section className="admin-empty" role="status">
            <h2 className="admin-empty__title">
              {!canCreate ? "Article creation access required" : "Newsroom setup is incomplete"}
            </h2>
            <p className="admin-empty__text">
              {!canCreate
                ? "This staff account does not have the article.create capability."
                : referencesFailed
                  ? "Categories and bylines could not be verified. No article was created."
                  : "Add at least one active category and one byline before creating an article."}
            </p>
            <Link href="/newsroom" className={buttonClassName("ghost")}>
              Back to newsroom
            </Link>
          </section>
        ) : (
          <form action={createArticle} className="form admin-form">
            <div className="field">
              <label className="field__label" htmlFor="title">Headline</label>
              <input id="title" name="title" className="field__control" maxLength={200} required autoFocus />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="summary">Summary</label>
              <textarea id="summary" name="summary" className="field__control" rows={3} maxLength={1000} />
              <p className="field__hint">Up to 1,000 characters; shown with the article listing.</p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="body">Article body</label>
              <textarea
                id="body"
                name="body"
                className="field__control"
                rows={14}
                maxLength={100000}
                required
                placeholder="Write plain text. Separate paragraphs with a blank line."
              />
              <p className="field__hint">Content is stored as structured text, not raw HTML.</p>
            </div>

            <div className="field-grid">
              <div className="field">
                <label className="field__label" htmlFor="categoryId">Category</label>
                <select id="categoryId" name="categoryId" className="field__control" required defaultValue="">
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="authorId">Byline</label>
                <select id="authorId" name="authorId" className="field__control" required defaultValue="">
                  <option value="" disabled>Select an author</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>{author.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label className="field__label" htmlFor="seoTitle">Search title (optional)</label>
                <input id="seoTitle" name="seoTitle" className="field__control" maxLength={70} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="seoDescription">Search description (optional)</label>
                <input id="seoDescription" name="seoDescription" className="field__control" maxLength={200} />
              </div>
            </div>

            <div className="form__actions">
              <Link href="/newsroom" className={buttonClassName("ghost")}>Cancel</Link>
              <button className={buttonClassName("primary")} type="submit">Create private draft</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
