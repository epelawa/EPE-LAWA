import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName, EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { createClient } from "../../../../lib/supabase";
import { publishArticle, reviseArticle, saveDraft, unpublishArticle } from "../../../../lib/actions";
import { adminHref } from "../../../../lib/admin-path";
import { articlePublicationState } from "../../../../lib/article-publication-state";
import { NEWS_COVERS, isNewsCoverKey } from "../../../../../main/lib/news-covers";
import NewsCoverUrlFields from "../../../../components/news-cover-url-fields";
import NewsShareTools from "../../../../components/news-share-tools";
import { publicNewsArticleUrl } from "../../../../../main/lib/news-urls";

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
  og_image_key: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  cover_source_url: string | null;
  cover_license_url: string | null;
  cover_caption: string | null;
};
type VersionHistoryItem = { id: string; version_number: number; title: string; state: string; created_at: string; created_by: string | null };
type AuditHistoryItem = { action: string; outcome: string; created_at: string; metadata: Record<string, unknown> | null };

function bodyForEditor(body: unknown): string {
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body ?? { type: "doc", content: [] }, null, 2);
  } catch {
    return "";
  }
}

function StatusMessage({ query }: { query: Record<string, string | undefined> }) {
  if (query.created) return <Notice tone="success" role="status">Private article draft created. It is not public until an authorized publisher publishes it.</Notice>;
  if (query.saved) return <Notice tone="success" role="status">Private draft saved. It is not public.</Notice>;
  if (query.submitted) return <Notice tone="success" role="status">This version remains private. Authorized publishers can publish it directly.</Notice>;
  if (query.reviewed) return <Notice tone="success" role="status">The version status was updated. Publication is a separate, audited action.</Notice>;
  if (query.published) return <Notice tone="success" role="status">Article published. The published version is now public.</Notice>;
  if (query.unpublished) return <Notice tone="neutral" role="status">Article unpublished.</Notice>;
  if (query.revised) return <Notice tone="success" role="status">A new private revision was created. The existing public version is unchanged.</Notice>;
  if (query.error) {
    const message =
      query.error === "cover"
        ? "Use one cover source. A linked cover needs a safe HTTPS image URL, alt text, credit, source page and license URL."
        : query.error === "save"
          ? "The draft could not be saved. It may have changed; reload before trying again."
          : query.error === "published"
            ? "The article was not published. Check article.publish access and reload for revision changes."
            : query.error === "unpublished"
              ? "The article could not be unpublished. Check the revision and your article.unpublish access."
              : query.error === "unpublish_confirmation"
                ? "Confirm that you want to take down the version currently visible to readers."
                : query.error === "revise"
                  ? "A new private revision could not be created. Check article.create access and reload."
                  : "The requested article action could not be completed.";
    return <Notice tone="danger" role="alert">{message}</Notice>;
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

  const [articleResult, categoryResult, authorResult, createCapability, publishCapability, unpublishCapability, versionHistoryResult, auditHistoryResult] = await Promise.all([
    supabase.from("articles").select(`
      id, slug, revision, current_version_id, published_version_id, published_at,
        current_version:article_versions!current_version_id(
        id,title,summary,body,state,version_number,author_id,category_id,created_by,seo_title,seo_description,og_image_key,
        cover_url,cover_alt,cover_credit,cover_source_url,cover_license_url,cover_caption
      )
    `).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.rpc("has_capability", { p_capability: "article.publish" }),
    supabase.rpc("has_capability", { p_capability: "article.unpublish" }),
    supabase.from("article_versions").select("id,version_number,title,state,created_at,created_by").eq("article_id", id).order("version_number", { ascending: false }).limit(100),
    supabase.from("audit_events").select("action,outcome,created_at,metadata").eq("resource_type", "article").eq("resource_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (articleResult.error) {
    return <PageFrame className="ui-stack"><PageIntro eyebrow="Newsroom" title="Article unavailable" description="Article details could not be verified." /><Notice tone="danger" role="alert"><strong>Article details could not be loaded.</strong><p>No changes were made. Try again in a moment.</p></Notice></PageFrame>;
  }
  if (!articleResult.data) notFound();
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
  const { hasPublishedVersion, currentVersionIsPublic, olderVersionRemainsPublic } = articlePublicationState({
    currentVersionId: article.current_version_id,
    publishedVersionId: article.published_version_id,
  });
  const editablePrivateVersion = (version.state === "draft" || version.state === "review") && canCreate;
  const canCreateRevision = (version.state === "approved" || version.state === "rejected" || version.state === "published") && canCreate;
  const canPublishCurrentVersion = ["draft", "review", "approved", "published"].includes(version.state);
  const displayState = currentVersionIsPublic ? "published" : version.state;
  const displayTone = displayState === "published" || displayState === "approved" ? "success" : displayState === "rejected" ? "danger" : displayState === "review" ? "warning" : "neutral";
  const versionHistory = (versionHistoryResult.data ?? []) as VersionHistoryItem[];
  const auditHistory = (auditHistoryResult.data ?? []) as AuditHistoryItem[];

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow={`Newsroom · Revision ${article.revision}`} title={version.title} description={<>Current version: <StatusBadge tone={displayTone}>{displayState}</StatusBadge>. {currentVersionIsPublic ? "This version is public." : olderVersionRemainsPublic ? "The previously published version remains live; this current version is private." : "No version of this article is public yet."}</>} actions={<Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>} meta={<><span>Revision {article.revision}</span><span>Slug: {article.slug}</span></>} />
      <StatusMessage query={query} />
      {article.published_version_id ? <Notice tone="neutral"><Link href={`/news/${article.slug}`} className="ui-text-link">Open public article</Link>{article.published_at ? <span className="ui-meta">Published {new Date(article.published_at).toLocaleDateString("en-NG")}</span> : null}</Notice> : null}

      {currentVersionIsPublic ? <NewsShareTools title={version.title} summary={version.summary} url={publicNewsArticleUrl(article.slug)} /> : null}

      <Panel>
        <SectionHeading eyebrow="Protected history" title="Revision and audit history" description="Read-only workflow history. Actor identifiers and private article content are not exposed here." />
        {versionHistoryResult.error ? <Notice tone="neutral" role="status">Revision history is unavailable for this article right now.</Notice> : versionHistory.length ? <div className="ui-table" role="region" aria-label="Article revision history" tabIndex={0}><table><thead><tr><th scope="col">Version</th><th scope="col">Headline</th><th scope="col">State</th><th scope="col">Created</th></tr></thead><tbody>{versionHistory.map((item) => <tr key={item.id}><td>{item.version_number}</td><td>{item.title}</td><td><StatusBadge tone={item.state === "approved" || item.state === "published" ? "success" : item.state === "rejected" ? "danger" : item.state === "review" ? "warning" : "neutral"}>{item.state}</StatusBadge></td><td><span className="ui-meta">{new Date(item.created_at).toLocaleString("en-NG")}</span></td></tr>)}</tbody></table></div> : <p className="ui-muted">No saved revisions are available.</p>}
        {auditHistoryResult.error ? <Notice tone="neutral" role="status">Audit history requires the audit.read capability and is not available to this account.</Notice> : auditHistory.length ? <div className="ui-table" role="region" aria-label="Article audit history" tabIndex={0}><table><thead><tr><th scope="col">Action</th><th scope="col">Outcome</th><th scope="col">Recorded</th></tr></thead><tbody>{auditHistory.map((item, index) => <tr key={`${item.created_at}-${item.action}-${index}`}><td>{item.action}</td><td>{item.outcome}</td><td><span className="ui-meta">{new Date(item.created_at).toLocaleString("en-NG")}</span></td></tr>)}</tbody></table></div> : <p className="ui-muted">No audit events are available.</p>}
      </Panel>

      {editablePrivateVersion || canCreateRevision ? (
        !referencesAvailable ? <EmptyPanel title="Bylines and categories unavailable" description="The article was not changed. Reload after the reference lists can be verified." /> : (
          <Panel>
            <SectionHeading eyebrow={editablePrivateVersion ? "Private editing" : "New version"} title={editablePrivateVersion ? "Edit current draft" : "Create a private correction"} description="Changes remain private. Publication is a separate, audited action." />
            <form action={editablePrivateVersion ? saveDraft : reviseArticle} className="ui-stack">
              <input type="hidden" name="articleId" value={article.id} />
              <input type="hidden" name="revision" value={String(article.revision)} />
              <div className="ui-field"><label className="label" htmlFor="title">Headline</label><input id="title" name="title" className="input" maxLength={200} required defaultValue={version.title} /></div>
              <div className="ui-field"><label className="label" htmlFor="summary">Summary</label><textarea id="summary" name="summary" className="input" rows={3} maxLength={1000} defaultValue={version.summary ?? ""} /></div>
              <div className="ui-field"><label className="label" htmlFor="body">Article body</label><textarea id="body" name="body" className="input" rows={14} maxLength={100000} required defaultValue={bodyForEditor(version.body)} /><p className="ui-meta">Use plain text with a blank line between paragraphs, or the structured document already shown.</p></div>
              <div className="ui-form-grid">
                <div className="ui-field"><label className="label" htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" className="input" required defaultValue={version.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>
                <div className="ui-field"><label className="label" htmlFor="authorId">Byline</label><select id="authorId" name="authorId" className="input" required defaultValue={version.author_id}>{authors.map((author) => <option key={author.id} value={author.id}>{author.display_name}</option>)}</select></div>
              </div>
              <div className="ui-field"><label className="label" htmlFor="ogImageKey">Approved cover (optional)</label><select id="ogImageKey" name="ogImageKey" className="input" defaultValue={isNewsCoverKey(version.og_image_key) ? version.og_image_key : ""}><option value="">No cover</option>{Object.entries(NEWS_COVERS).map(([key, cover]) => <option key={key} value={key}>{cover.title} — {cover.credit}</option>)}</select><p className="ui-meta">Approved, unmodified Commons images only.</p></div>
              <NewsCoverUrlFields idPrefix="edit-cover" initial={{ url: version.cover_url, alt: version.cover_alt, credit: version.cover_credit, sourceUrl: version.cover_source_url, licenseUrl: version.cover_license_url, caption: version.cover_caption }} />
              <div className="ui-form-grid">
                <div className="ui-field"><label className="label" htmlFor="seoTitle">Search title</label><input id="seoTitle" name="seoTitle" className="input" maxLength={70} defaultValue={version.seo_title ?? ""} /></div>
                <div className="ui-field"><label className="label" htmlFor="seoDescription">Search description</label><input id="seoDescription" name="seoDescription" className="input" maxLength={200} defaultValue={version.seo_description ?? ""} /></div>
              </div>
              <div className="ui-actions">{editablePrivateVersion ? <button className={buttonClassName("primary")} type="submit" name="intent" value="save">Save private draft</button> : <button className={buttonClassName("primary")} type="submit">Create private correction draft</button>}</div>
            </form>
          </Panel>
        )
      ) : <EmptyPanel title="This version is read-only" description="Your current access does not allow editing this version or creating a private correction." />}

      {!currentVersionIsPublic && canPublishCurrentVersion ? <Panel>
        <SectionHeading eyebrow="Publication" title="Publish now" description="Publishing makes the current version publicly visible immediately." />
        {canPublish ? <><p className="ui-muted">No second reviewer is required; the database still checks the verified staff session, article.publish capability and current revision, then records the action in the audit log.</p><form action={publishArticle} className="ui-actions"><input type="hidden" name="articleId" value={article.id} /><input type="hidden" name="revision" value={String(article.revision)} /><button className={buttonClassName("primary")} type="submit">Publish now</button></form></> : <p className="ui-muted">This account does not have article.publish access.</p>}
      </Panel> : null}
      {hasPublishedVersion ? <Panel>
        <SectionHeading
          eyebrow="Publication"
          title="Take down public article"
          description={olderVersionRemainsPublic
            ? "An older version remains live while this current version is private. This takes down the version currently visible to readers; it does not publish or change the private draft."
            : "The current version is visible to readers. This takes it down without deleting any saved versions."}
        />
        {canUnpublish ? <form action={unpublishArticle} className="ui-stack">
          <input type="hidden" name="articleId" value={article.id} />
          <input type="hidden" name="revision" value={String(article.revision)} />
          <label className="ui-row"><input type="checkbox" name="confirmUnpublish" value="yes" required /> I confirm taking down the version currently visible to readers.</label>
          <div className="ui-actions"><button className={buttonClassName("secondary")} type="submit">Unpublish public article</button></div>
        </form> : <p className="ui-muted">This account does not have article.unpublish access.</p>}
      </Panel> : null}
    </PageFrame>
  );
}
