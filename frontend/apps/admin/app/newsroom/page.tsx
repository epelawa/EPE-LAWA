import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyState, buttonClassName } from "@epelawa/ui";

/**
 * Admin newsroom — article list.
 *
 * Lists all articles with their current state, revision, and updated time.
 * Filter by state via query parameter (?state=draft|review|approved|rejected).
 */
export default async function NewsroomPage({ searchParams }: { searchParams: { state?: string } }) {
  const supabase = createClient();

  let query = supabase
    .from("articles")
    .select(`
      id,
      slug,
      revision,
      published_version_id,
      published_at,
      created_at,
      updated_at,
      current_version:current_version_id (
        id,
        title,
        state,
        version_number
      ),
      owner:owner_id (
        id
      )
    `)
    .order("updated_at", { ascending: false });

  if (searchParams.state) {
    query = query.filter("current_version.state", "eq", searchParams.state);
  }

  const { data: articles, error } = await query;

  if (error) {
    return (
      <main id="main" className="site-main" tabIndex={-1}>
        <div className="ep-container">
          <div className="page-header">
            <h1 className="page-header__title">Newsroom</h1>
          </div>
          <div className="admin-empty">
            <h2 className="admin-empty__title">Error loading articles</h2>
            <p className="admin-empty__text">{error.message}</p>
          </div>
        </div>
      </div>
    </main>
  );

  const stateFilter = searchParams.state ?? "all";
  const drafts = articles?.filter((a) => (a.current_version as any)?.state === "draft").length ?? 0;
  const review = articles?.filter((a) => (a.current_version as any)?.state === "review").length ?? 0;
  const approved = articles?.filter((a) => (a.current_version as any)?.state === "approved").length ?? 0;

  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <div>
            <h1 className="page-header__title">Newsroom</h1>
            <p className="page-header__lede">
              All articles. Drafts are invisible to the public until published.
            </p>
          </div>
          <Link href="/newsroom/new" className={buttonClassName("primary")}>
            Create draft
          </Link>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-card__value">{drafts}</p>
            <p className="stat-card__label">Drafts</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">{review}</p>
            <p className="stat-card__label">In review</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">{approved}</p>
            <p className="stat-card__label">Approved</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">{articles?.length ?? 0}</p>
            <p className="stat-card__label">Total articles</p>
          </div>
        </div>

        {articles && articles.length > 0 ? (
          <table className="ep-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>State</th>
                <th>Revision</th>
                <th>Slug</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const cv = article.current_version as any;
                const isPublished = !!article.published_version_id;
                return (
                  <tr key={article.id}>
                    <td>
                      <Link href={`/newsroom/${article.id}`}>{cv?.title || "(untitled)"}</Link>
                    </td>
                    <td>
                      <span className={`ep-state-badge ep-state--${cv?.state}`}>
                        {cv?.state}
                      </span>
                      {isPublished && <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-small)", color: "var(--color-success)" }}>● Published</span>}
                    </td>
                    <td>{article.revision}</td>
                    <td>{article.slug}</td>
                    <td>{new Date(article.updated_at).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/newsroom/${article.id}`} className={buttonClassName("ghost")}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <h2 className="admin-empty__title">No articles yet</h2>
            <p className="admin-empty__text">
              Create your first draft to get started. Nothing appears publicly
              until it is reviewed, approved, and published.
            </p>
            <div style={{ marginTop: "var(--space-6)" }}>
              <Link href="/newsroom/new" className={buttonClassName("primary")}>
                Create draft
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
