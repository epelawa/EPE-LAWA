import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { EmptyState, buttonClassName } from "@epelawa/ui";

type NewsroomArticle = {
  id: string;
  slug: string;
  revision: number;
  current_version_id: string | null;
  published_version_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  current_version: { id: string; title: string; state: string; version_number: number } | null;
};

/** Admin newsroom — private articles and their current publication state. */
export default async function NewsroomPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const supabase = await createClient();
  const { state: requestedState } = await searchParams;
  const allowedStates = new Set(["draft", "review", "approved", "rejected", "published"]);
  const state = requestedState && allowedStates.has(requestedState) ? requestedState : undefined;

  let query = supabase
    .from("articles")
    .select(`
      id,
      slug,
      revision,
      current_version_id,
      published_version_id,
      published_at,
      created_at,
      updated_at,
      current_version:current_version_id (
        id,
        title,
        state,
        version_number
      )
    `)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (state) query = query.filter("current_version.state", "eq", state);

  const { data, error } = await query;
  if (error) {
    return (
      <div className="site-main">
        <div className="ep-container">
          <div className="page-header"><h1 className="page-header__title">Newsroom</h1></div>
          <div className="admin-empty" role="alert">
            <h2 className="admin-empty__title">Error loading articles</h2>
            <p className="admin-empty__text">The newsroom could not verify article data. Try again in a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const articles = (data ?? []) as unknown as NewsroomArticle[];
  const drafts = articles.filter((article) => article.current_version?.state === "draft").length;
  const readyToPublish = articles.filter((article) => {
    const version = article.current_version;
    const publishable = version && ["draft", "review", "approved"].includes(version.state);
    return Boolean(publishable && article.published_version_id !== article.current_version_id);
  }).length;
  const published = articles.filter((article) => Boolean(article.published_version_id)).length;

  return (
    <div className="site-main">
      <div className="ep-container">
        <div className="page-header">
          <div>
            <h1 className="page-header__title">Newsroom</h1>
            <p className="page-header__lede">
              Save privately, then publish immediately when the final version is ready. Publication requires verified staff access and is recorded in the audit log.
            </p>
          </div>
          <Link href="/newsroom/new" className={buttonClassName("primary")}>Create draft</Link>
        </div>

        <div className="stat-grid" aria-label="Newsroom counts">
          <div className="stat-card"><p className="stat-card__value">{drafts}</p><p className="stat-card__label">Private drafts</p></div>
          <div className="stat-card"><p className="stat-card__value">{readyToPublish}</p><p className="stat-card__label">Versions ready to publish</p></div>
          <div className="stat-card"><p className="stat-card__value">{published}</p><p className="stat-card__label">Articles with a public version</p></div>
          <div className="stat-card"><p className="stat-card__value">{articles.length}</p><p className="stat-card__label">Articles loaded</p></div>
        </div>

        {articles.length > 0 ? (
          <div className="table-wrap">
            <table className="ep-table">
              <thead><tr><th>Title</th><th>Current state</th><th>Revision</th><th>Slug</th><th>Updated</th><th>Action</th></tr></thead>
              <tbody>
                {articles.map((article) => {
                  const version = article.current_version;
                  const hasPublicVersion = Boolean(article.published_version_id);
                  return (
                    <tr key={article.id}>
                      <td><Link href={`/newsroom/${article.id}`}>{version?.title || "(untitled)"}</Link></td>
                      <td>
                        <span className={`ep-state-badge ep-state--${version?.state ?? "unknown"}`}>{version?.state ?? "unknown"}</span>
                        {hasPublicVersion ? <span className="admin-published-label">Public version</span> : null}
                      </td>
                      <td>{article.revision}</td>
                      <td>{article.slug}</td>
                      <td>{new Date(article.updated_at).toLocaleDateString("en-NG")}</td>
                      <td><Link href={`/newsroom/${article.id}`} className={buttonClassName("ghost")}>Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No articles yet" description="Create a private draft to begin. Nothing appears publicly until a publisher explicitly publishes it." />
        )}
      </div>
    </div>
  );
}
