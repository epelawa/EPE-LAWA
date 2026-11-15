import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, buttonClassName } from "@epelawa/ui";

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

  if (state === "published") query = query.not("published_version_id", "is", null);
  else if (state) query = query.filter("current_version.state", "eq", state);

  const { data, error } = await query;
  if (error) {
    return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Newsroom" description="Manage private drafts and published versions." /><Notice tone="danger" role="alert"><strong>Articles could not be loaded.</strong><p>The newsroom could not verify article data. Try again in a moment.</p></Notice></PageFrame>;
  }

  const articles = (data ?? []) as unknown as NewsroomArticle[];
  const drafts = articles.filter((article) => article.current_version?.state === "draft").length;
  const readyToPublish = articles.filter((article) => {
    const version = article.current_version;
    const publishable = version && ["draft", "review", "approved"].includes(version.state);
    return Boolean(publishable && article.published_version_id !== article.current_version_id);
  }).length;
  const published = articles.filter((article) => Boolean(article.published_version_id)).length;
  const states = ["draft", "review", "approved", "rejected", "published"];

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="Staff workspace · Editorial" title="Newsroom" description="Save privately, then publish immediately when the final version is ready. Publication requires verified staff access and is recorded in the audit log." actions={<div className="ui-actions"><Link href={adminHref("/newsroom/settings")} className={buttonClassName("secondary")}>Categories & bylines</Link><Link href={adminHref("/newsroom/new")} className={buttonClassName("primary")}>Create draft</Link></div>} />
      <Panel className="ui-grid ui-grid--3" aria-label="Newsroom counts">
        <div><p className="ui-number">{drafts}</p><p className="ui-muted">Private drafts</p></div>
        <div><p className="ui-number">{readyToPublish}</p><p className="ui-muted">Versions ready to publish</p></div>
        <div><p className="ui-number">{published}</p><p className="ui-muted">Articles with a public version</p></div>
      </Panel>
      <section className="ui-stack-sm admin-newsroom-list" aria-labelledby="article-list-heading">
        <SectionHeading eyebrow={`${articles.length} loaded`} title="Articles" id="article-list-heading" description="Current version and publication state for each article." />
        <nav className="ui-tabs" aria-label="Filter articles by workflow state or publication">
          <Link href={adminHref("/newsroom")} aria-current={!state ? "page" : undefined}>All</Link>
          {states.map((item) => <Link key={item} href={adminHref(`/newsroom?state=${item}`)} aria-current={state === item ? "page" : undefined}>{item[0].toUpperCase() + item.slice(1)}</Link>)}
        </nav>
        {articles.length ? <Panel className="ui-table admin-newsroom-table" role="region" aria-label="Articles list; scroll horizontally to see all columns" tabIndex={0}><table><thead><tr><th scope="col">Article</th><th scope="col">State</th><th scope="col">Revision</th><th scope="col">Slug</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>
          {articles.map((article) => {
            const version = article.current_version;
            const hasPublicVersion = Boolean(article.published_version_id);
            const currentVersionIsPublic = Boolean(article.current_version_id && article.published_version_id === article.current_version_id);
            const displayState = currentVersionIsPublic ? "published" : version?.state ?? "unknown";
            const tone = displayState === "published" || displayState === "approved" ? "success" : displayState === "rejected" ? "danger" : displayState === "review" ? "warning" : "neutral";
            return <tr key={article.id}><td><Link href={adminHref(`/newsroom/${article.id}`)} className="ui-item-title">{version?.title || "Untitled article"}</Link></td><td><StatusBadge tone={tone}>{displayState}</StatusBadge>{hasPublicVersion && !currentVersionIsPublic ? <span className="ui-meta">Earlier version is public</span> : null}</td><td>{article.revision}</td><td><span className="ui-meta">{article.slug}</span></td><td><span className="ui-meta">{new Date(article.updated_at).toLocaleDateString("en-NG")}</span></td><td><Link href={adminHref(`/newsroom/${article.id}`)} className={buttonClassName("secondary")}>Open</Link></td></tr>;
          })}
        </tbody></table></Panel> : <EmptyPanel title={state ? `No ${state} articles` : "No articles yet"} description={state ? "No article currently matches this state." : "Create a private draft to begin. Nothing appears publicly until a publisher explicitly publishes it."} actions={!state ? <Link href={adminHref("/newsroom/new")} className={buttonClassName("primary")}>Create draft</Link> : undefined} />}
      </section>
    </PageFrame>
  );
}
