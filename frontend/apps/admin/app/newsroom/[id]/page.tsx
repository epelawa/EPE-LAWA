import { submitArticle } from "../../../lib/actions";
import { EmptyState, Alert, buttonClassName } from "@epelawa/ui";
import Link from "next/link";

/**
 * Edit an existing article.
 *
 * Loads the article and its current version. Submits changes through the
 * article_submit security definer function (draft → review) with revision CAS.
 */
export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await (await import("../../../lib/supabase")).createClient();

  const { data, error } = await supabase
    .from("articles")
    .select(`
      id,
      slug,
      revision,
      current_version:current_version_id (
        id,
        title,
        summary,
        body,
        state,
        version_number
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <main id="main" className="site-main" tabIndex={-1}>
        <div className="ep-container">
          <div className="admin-empty">
            <h2 className="admin-empty__title">Article not found</h2>
            <p className="admin-empty__text">{error?.message || "The article does not exist."}</p>
            <Link href="/newsroom" className={buttonClassName("primary")}>
              Back to newsroom
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const cv = data.current_version as any;

  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <h1 className="page-header__title">Edit draft</h1>
          <p className="page-header__lede">
            Edit article &ldquo;{cv?.title || "(untitled)"}&rdquo;. Revision {data.revision}.
          </p>
        </div>

        <form action={(formData: FormData) => submitArticle(id, data.revision)} className="form">
          <input type="hidden" name="articleId" value={id} />
          <input type="hidden" name="revision" value={String(data.revision)} />

          <div className="field">
            <label className="field__label" htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              className="field__control"
              defaultValue={cv?.title || ""}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="summary">Summary</label>
            <textarea
              id="summary"
              name="summary"
              className="field__control"
              rows={3}
              defaultValue={cv?.summary || ""}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="body">Body</label>
            <textarea
              id="body"
              name="body"
              className="field__control"
              rows={12}
              defaultValue={typeof cv?.body === "string" ? cv.body : JSON.stringify(cv?.body, null, 2)}
            />
          </div>

          <div className="form__actions">
            <button className={buttonClassName("primary")} type="submit">
              Submit for review
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
