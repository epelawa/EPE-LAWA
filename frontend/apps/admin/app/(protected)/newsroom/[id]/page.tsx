import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@epelawa/ui";
import { createClient } from "../../../../lib/supabase";
import { publishArticle, reviseArticle, saveDraft, unpublishArticle } from "../../../../lib/actions";

export const metadata: Metadata = { title: "Article workflow", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Option = { id: string; label?: string; display_name?: string };
type ArticleVersion = {
  id: string;
  title: string;
  summary: string | null;
  body: unknown;
  state: "draft" | "review" | "approved" | "rejected" | "published";
  version_number: number;
  author_id: string;
  category_id: string;
  created_by: string;
  seo_title: string | null;
  seo_description: string | null;
};

function bodyForEditor(body: unknown): string {
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body ?? { type: "doc", content: [] }, null, 2);
  } catch {
    return "";
  }
}

function StatusMessage({ query }: { query: Record<string, string | undefined> }) {
  if (query.saved) return <p className="admin-alert admin-alert--success" role="status">Private draft saved. It is not public.</p>;
  if (query.submitted) return <p className="admin-alert admin-alert--success" role="status">This version remains private. Authorized publishers can publish it directly.</p>;
  if (query.reviewed) return <p className="admin-alert admin-alert--success" role="status">The version status was updated. Publication is a separate, audited action.</p>;
  if (query.published) return <p className="admin-alert admin-alert--success" role="status">Article published. The published version is now public.</p>;
  if (query.unpublished) return <p className="admin-alert" role="status">Article unpublished.</p>;
  if (query.revised) return <p className="admin-alert admin-alert--success" role="status">A new private revision was created. The existing public version is unchanged.</p>;
  if (query.error) {
    const message = query.error === "save"
      ? "The draft could not be saved. It may have changed; reload before trying again."
      : query.error === "published"
        ? "The article was not published. Check article.publish access and reload for revision changes."
        : query.error === "unpublished"
          ? "The article could not be unpublished. Check the revision and your article.unpublish access."
          : query.error === "revise"
            ? "A new private revision could not be created. Check article.create access and reload."
            : "The requested article action could not be completed.";
    return <p className="admin-alert" role="alert">{message}</p>;
  }
  return null;
}

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query, supabase] = await Promise.all([params, searchParams, createClient()]);
  if (!UUID.test(id)) notFound();

  const [articleResult, categoryResult, authorResult, createCapability, publishCapability, unpublishCapability] = await Promise.all([
    supabase.from("articles").select(`
      id, slug, revision, current_version_id, published_version_id, published_at,
      current_version:article_versions!articles_current_version_fkey(
        id,title,summary,body,state,version_number,author_id,category_id,created_by,seo_title,seo_description
      )
    `).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.rpc("has_capability", { p_capability: "article.publish" }),
    supabase.rpc("has_capability", { p_capability: "article.unpublish" }),
  ]);
  if (articleResult.error || !articleResult.data) notFound();
  const article = articleResult.data as {
    id: string;
    slug: string;
    revision: number;
    current_version_id: string | null;
    published_version_id: string | null;
    published_at: string | null;
    current_version: ArticleVersion | ArticleVersion[] | null;
  };
  const version = Array.isArray(article.current_version) ? article.current_version[0] : article.current_version;
  if (!version) notFound();

  const categories = (categoryResult.data ?? []) as Option[];
  const authors = (authorResult.data ?? []) as Option[];
  const canCreate = createCapability.data === true;
  const canPublish = publishCapability.data === true;
  const canUnpublish = unpublishCapability.data === true;
  const referencesAvailable = !categoryResult.error && !authorResult.error && categories.length > 0 && authors.length > 0;
  const currentVersionIsPublic = article.published_version_id === article.current_version_id;
  const olderVersionRemainsPublic = Boolean(article.published_version_id) && !currentVersionIsPublic;
  const editablePrivateVersion = (version.state === "draft" || version.state === "review") && canCreate;
  const canCreateRevision = (version.state === "approved" || version.state === "rejected" || version.state === "published") && canCreate;
  const canPublishCurrentVersion = ["draft", "review", "approved", "published"].includes(version.state);

  return (
    <div className="site-main">
      <div className="ep-container">
        <header className="page-header">
          <div>
            <p className="page-header__eyebrow">Newsroom · Revision {article.revision}</p>
            <h1 className="page-header__title">{version.title}</h1>
            <p className="page-header__lede">
              Current version: {version.state}. {currentVersionIsPublic
                ? "This version is public."
                : olderVersionRemainsPublic
                  ? "The previously published version remains live; this current version is private."
                  : "No version of this article is public yet."}
            </p>
          </div>
          <Link href="/newsroom" className={buttonClassName("ghost")}>Back to newsroom</Link>
        </header>

        <StatusMessage query={query} />

        {article.published_version_id ? (
          <p className="admin-inline-note">
            <Link href={`/news/${article.slug}`} className="admin-text-link">Open public article</Link>
            {article.published_at ? ` · Published ${new Date(article.published_at).toLocaleDateString("en-NG")}` : ""}
          </p>
        ) : null}

        {editablePrivateVersion || canCreateRevision ? (
          !referencesAvailable ? (
            <section className="admin-empty" role="status">
              <h2 className="admin-empty__title">Bylines and categories unavailable</h2>
              <p className="admin-empty__text">The article was not changed. Reload after the reference lists can be verified.</p>
            </section>
          ) : (
            <form action={editablePrivateVersion ? saveDraft : reviseArticle} className="form admin-form">
              <input type="hidden" name="articleId" value={article.id} />
              <input type="hidden" name="revision" value={String(article.revision)} />
              <div className="field">
                <label className="field__label" htmlFor="title">Headline</label>
                <input id="title" name="title" className="field__control" maxLength={200} required defaultValue={version.title} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="summary">Summary</label>
                <textarea id="summary" name="summary" className="field__control" rows={3} maxLength={1000} defaultValue={version.summary ?? ""} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="body">Article body</label>
                <textarea id="body" name="body" className="field__control" rows={14} maxLength={100000} required defaultValue={bodyForEditor(version.body)} />
                <p className="field__hint">Use plain text with a blank line between paragraphs, or the structured document already shown.</p>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label className="field__label" htmlFor="categoryId">Category</label>
                  <select id="categoryId" name="categoryId" className="field__control" required defaultValue={version.category_id}>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="authorId">Byline</label>
                  <select id="authorId" name="authorId" className="field__control" required defaultValue={version.author_id}>
                    {authors.map((author) => <option key={author.id} value={author.id}>{author.display_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label className="field__label" htmlFor="seoTitle">Search title</label>
                  <input id="seoTitle" name="seoTitle" className="field__control" maxLength={70} defaultValue={version.seo_title ?? ""} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="seoDescription">Search description</label>
                  <input id="seoDescription" name="seoDescription" className="field__control" maxLength={200} defaultValue={version.seo_description ?? ""} />
                </div>
              </div>
              <div className="form__actions">
                {editablePrivateVersion ? (
                  <button className={buttonClassName("primary")} type="submit" name="intent" value="save">Save private draft</button>
                ) : (
                  <button className={buttonClassName("primary")} type="submit">Create private correction draft</button>
                )}
              </div>
            </form>
          )
        ) : null}

        {!currentVersionIsPublic && canPublishCurrentVersion ? (
          <section className="admin-empty" aria-labelledby="publish-heading">
            <h2 id="publish-heading" className="admin-empty__title">Publish now</h2>
            {canPublish ? (
              <>
                <p className="admin-empty__text">
                  This current version will become publicly visible immediately. No second reviewer is required; the database still checks the verified staff session, article.publish capability and current revision, then records the action in the audit log.
                </p>
                <form action={publishArticle} className="admin-action-row">
                  <input type="hidden" name="articleId" value={article.id} />
                  <input type="hidden" name="revision" value={String(article.revision)} />
                  <button className="admin-action admin-action--primary" type="submit">Publish now</button>
                </form>
              </>
            ) : <p className="admin-empty__text">This account does not have article.publish access.</p>}
          </section>
        ) : null}

        {currentVersionIsPublic ? (
          <section className="admin-empty" aria-labelledby="unpublish-heading">
            <h2 id="unpublish-heading" className="admin-empty__title">Public article</h2>
            {canUnpublish ? (
              <form action={unpublishArticle} className="admin-action-row">
                <input type="hidden" name="articleId" value={article.id} />
                <input type="hidden" name="revision" value={String(article.revision)} />
                <button className="admin-action" type="submit">Unpublish current article</button>
              </form>
            ) : <p className="admin-empty__text">This account does not have article.unpublish access.</p>}
          </section>
        ) : null}
      </div>
    </div>
  );
}
