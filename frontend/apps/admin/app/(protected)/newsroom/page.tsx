import Link from "../../../components/admin-link";
import styles from "./newsroom-list.module.css";
import NewsroomFilter from "../../../components/newsroom-filter";
import { createStaffClient } from "../../../lib/supabase";
import { deleteArticle } from "../../../lib/actions";
import { adminHref } from "../../../lib/admin-path";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, StatusBadge, SubmitButton, buttonClassName } from "@epelawa/ui";
import NewsArticleComposer from "../../../components/news-article-composer";
import { coverUploadState } from "../../../lib/media-r2";
import { articleIdRange, shortArticleId } from "../../../../main/lib/article-ref";

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
export default async function NewsroomPage({ searchParams }: { searchParams: Promise<{ state: string; deleted: string; error: string; q?: string }> }) {
  const supabase = await createStaffClient();
  const { state: requestedState, deleted, error: errorFlag, q } = await searchParams;
  // Search by article ID (short or full) or by headline words.
  const search = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const idRange = search ? articleIdRange(search) : null;
  const titleSearch = search && !idRange ? search.replace(/[%_,()]/g, " ").trim() : "";
  const allowedStates = new Set(["draft", "review", "approved", "rejected", "published"]);
  const state = requestedState && allowedStates.has(requestedState) ? requestedState : undefined;

  const versionJoin = (state && state !== "published") || titleSearch ? "current_version:current_version_id!inner" : "current_version:current_version_id";
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
      ${versionJoin} (
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
  if (idRange) query = idRange.exact ? query.eq("id", idRange.from) : query.gte("id", idRange.from).lte("id", idRange.to);
  if (titleSearch) query = query.ilike("current_version.title", `%${titleSearch}%`);

  const [{ data, error }, editCapability, deleteCapability, session, categoryList, authorList] = await Promise.all([
    query,
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.rpc("has_capability", { p_capability: "article.publish" }),
    supabase.auth.getUser(),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
  ]);
  const canEdit = !editCapability.error && editCapability.data === true;
  const canDelete = !deleteCapability.error && deleteCapability.data === true;
  const canCompose = canEdit && (categoryList.data ?? []).length > 0 && (authorList.data ?? []).length > 0;
  if (error) {
    return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Newsroom" description="Every save publishes straight away — the stories you see here are what readers get." /><Notice tone="danger" role="alert"><strong>Articles could not be loaded.</strong><p>The newsroom could not verify article data. Try again in a moment.</p></Notice></PageFrame>;
  }

  const articles = (data ?? []) as unknown as NewsroomArticle[];
  // The upload form sits beside the article list (stacked on phones) — no popup.
  const uploadAction = canCompose
    ? <a href="#upload-article" className={buttonClassName("primary")}>Upload an article</a>
    : <Link href={adminHref("/newsroom/new")} className={buttonClassName("primary")}>Upload an article</Link>;
  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="Staff workspace · Editorial" title="Newsroom" actions={uploadAction} />
      {deleted ? <Notice tone="neutral" role="status">The story and all its records were permanently deleted.</Notice> : null}
      {errorFlag === "delete_confirmation" ? <Notice tone="warning" role="alert">Tick the confirm box before a story can be deleted.</Notice> : null}
      {errorFlag === "delete" ? <Notice tone="danger" role="alert">The story could not be deleted. Check your access and try again.</Notice> : null}
      <div className={canCompose ? styles.workspace : undefined}>
      {canCompose ? (
        <section id="upload-article" className={`ui-stack-sm ${styles.uploadColumn}`} aria-labelledby="upload-article-heading">
          <h2 id="upload-article-heading" className={styles.columnHeading}>Upload an article</h2>
          <Panel className={styles.uploadPanel}>
            <NewsArticleComposer
              categories={(categoryList.data ?? []) as { id: string; label: string }[]}
              authors={(authorList.data ?? []) as { id: string; display_name: string }[]}
              coverUploadAvailable={coverUploadState().state === "ready"}
            />
          </Panel>
        </section>
      ) : null}
      <section className={`ui-stack-sm admin-newsroom-list ${styles.listColumn}`} aria-labelledby="article-list-heading">
        <div className={styles.listHeader}><h2 id="article-list-heading">Articles</h2><NewsroomFilter state={state ?? ""} /></div>
        <form method="get" action={adminHref("/newsroom")} role="search" className={styles.idSearch}>
          {state ? <input type="hidden" name="state" value={state} /> : null}
          <label><span className="sr-only">Search by article ID or headline</span><input className="input" type="search" name="q" defaultValue={search} maxLength={80} placeholder="Article ID (e.g. 1A2B3C4D) or headline words" /></label>
          <SubmitButton className={buttonClassName("secondary")} pendingLabel="Searching…">Search</SubmitButton>
          {search ? <Link href={adminHref(state ? `/newsroom?state=${state}` : "/newsroom")} className="ui-text-link">Clear</Link> : null}
        </form>
        {search ? <p className="ui-meta" role="status">{articles.length} article{articles.length === 1 ? "" : "s"} matching {idRange ? "ID" : "headline"} “{search}”.</p> : null}
        {articles.length ? <Panel className={`ui-table admin-newsroom-table ${styles.table}`} role="region" aria-label="Articles list; scroll horizontally to see all columns" tabIndex={0}><table><thead><tr><th scope="col">Article</th><th scope="col">ID</th><th scope="col">State</th><th scope="col">Slug</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>
          {articles.map((article) => {
            const version = article.current_version;
            const hasPublicVersion = Boolean(article.published_version_id);
            const currentVersionIsPublic = Boolean(article.current_version_id && article.published_version_id === article.current_version_id);
            const displayState = currentVersionIsPublic ? "published" : version?.state ?? "unknown";
            const tone = displayState === "published" || displayState === "approved" ? "success" : displayState === "rejected" ? "danger" : displayState === "review" ? "warning" : "neutral";
            return <tr key={article.id}><td><Link href={adminHref(`/newsroom/${article.id}`)} className="ui-item-title">{version?.title || "Untitled article"}</Link></td><td><code className={styles.articleId} title={article.id}>{shortArticleId(article.id)}</code></td><td><StatusBadge tone={tone}>{displayState}</StatusBadge>{hasPublicVersion && !currentVersionIsPublic ? <span className="ui-meta">Earlier version is public</span> : null}</td><td><span className="ui-meta">{article.slug}</span></td><td><span className="ui-meta">{new Date(article.updated_at).toLocaleDateString("en-NG")}</span></td><td><span className={styles.rowActions}><Link href={adminHref(`/newsroom/${article.id}`)} className={buttonClassName("secondary")}>Open</Link>{canEdit ? <Link href={`${adminHref(`/newsroom/${article.id}`)}#article-editor`} className={buttonClassName("secondary")}>Edit</Link> : null}{canDelete ? <details className={styles.deleteDisclosure}><summary className={buttonClassName("danger")}>Delete</summary><form action={deleteArticle} className={styles.deleteConfirm}><input type="hidden" name="articleId" value={article.id} /><label className="ui-row"><input type="checkbox" name="confirmDelete" value="yes" required /> Delete everywhere, for good.</label><SubmitButton pendingLabel="Deleting…" className={buttonClassName("danger")}>Yes, delete forever</SubmitButton><span className="ui-meta">Removes the story, its versions and its comments from the database.</span></form></details> : null}</span></td></tr>;
          })}
        </tbody></table></Panel> : null}
        {articles.length ? <ul className={styles.cards} aria-label="Articles list">{articles.map((article) => {
          const version = article.current_version;
          const currentIsPublic = Boolean(article.current_version_id && article.published_version_id === article.current_version_id);
          const stateLabel = currentIsPublic ? "published" : version?.state ?? "unknown";
          const tone = stateLabel === "published" || stateLabel === "approved" ? "success" : stateLabel === "rejected" ? "danger" : stateLabel === "review" ? "warning" : "neutral";
          return <li key={article.id} className={styles.card}><h3 className={styles.title}>{version?.title || "Untitled article"}</h3><div className={styles.meta}><code className={styles.articleId} title={article.id}>ID {shortArticleId(article.id)}</code><StatusBadge tone={tone}>{stateLabel}</StatusBadge><time dateTime={article.updated_at}>Updated {new Date(article.updated_at).toLocaleDateString("en-NG")}</time></div>{article.published_version_id && !currentIsPublic ? <span className="ui-meta">Earlier version is public</span> : null}<div className={styles.actions}><Link href={adminHref(`/newsroom/${article.id}`)} className={buttonClassName("secondary")}>Open article</Link>{canEdit ? <Link href={`${adminHref(`/newsroom/${article.id}`)}#article-editor`} className={buttonClassName("secondary")}>Edit article</Link> : null}{canDelete ? <div className={styles.deleteDisclosure}><form action={deleteArticle} className={styles.deleteConfirm}><input type="hidden" name="articleId" value={article.id} /><label className="ui-row"><input type="checkbox" name="confirmDelete" value="yes" required /> Delete everywhere, for good.</label><SubmitButton pendingLabel="Deleting…" className={buttonClassName("danger")}>Yes, delete forever</SubmitButton><span className="ui-meta">Removes the story, its versions and its comments from the database.</span></form></div> : null}</div></li>;
        })}</ul> : <EmptyPanel title={search ? "No matching articles" : state ? `No ${state} articles` : "No articles yet"} description={search ? "No article has that ID or headline. Check the ID (8 characters, shown in the ID column) and try again." : state ? "No article currently matches this state." : "Publish your first article — it appears on the public site the moment you save it."} actions={!state ? uploadAction : undefined} />}
      </section>
      </div>
    </PageFrame>
  );
}
