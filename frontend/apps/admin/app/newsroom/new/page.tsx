import { createArticle } from "../../../lib/actions";
import { EmptyState, Alert, buttonClassName } from "@epelawa/ui";

/**
 * Create a new draft article.
 *
 * Submits through the article_create security definer function via a server
 * action. The article starts as a draft and is invisible to the public until
 * published.
 */
export default function NewArticlePage() {
  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <h1 className="page-header__title">New draft</h1>
          <p className="page-header__lede">
            Create a draft article. It will be invisible to the public until
            published by authorised staff.
          </p>
        </div>

        <form action={createArticle} className="form">
          <div className="field">
            <label className="field__label" htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              className="field__control"
              placeholder="Article title"
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
              placeholder="Short summary shown in listings"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="body">Body</label>
            <textarea
              id="body"
              name="body"
              className="field__control"
              rows={12}
              placeholder="Write your article here..."
            />
            <p className="field__hint">
              Plain text body. Rich-text editor (Tiptap) is a future enhancement.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="categoryId">Category UUID</label>
            <input
              id="categoryId"
              name="categoryId"
              className="field__control"
              placeholder="Category UUID (optional)"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="authorId">Author UUID</label>
            <input
              id="authorId"
              name="authorId"
              className="field__control"
              placeholder="Author UUID (optional)"
            />
          </div>

          <div className="form__actions">
            <button className={buttonClassName("primary")} type="submit">
              Create draft
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
