import AuthorPicker from "../../../../components/author-picker";
import ProgressiveEditor from "../../../../components/progressive-editor";
import type { Metadata } from "next";
import Link from "../../../../components/admin-link";
import { notFound } from "next/navigation";
import { buttonClassName, EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { publishArticle, reviseArticle, saveArticleTags, saveDraft, reviseArticleWithFeedback, saveDraftWithFeedback, setArticleBreaking, unpublishArticle } from "../../../../lib/actions";
import { adminHref } from "../../../../lib/admin-path";
import { articlePublicationState } from "../../../../lib/article-publication-state";
import NewsroomToast from "../../../../components/newsroom-toast";
import NewsCoverUrlFields from "../../../../components/news-cover-url-fields";
import { coverUploadState } from "../../../../lib/media-r2";
import { publishedNewsCover } from "../../../../../main/lib/published-news-cover";
import { absoluteUrl } from "../../../../../main/lib/site";
import NewsShareTools from "../../../../components/news-share-tools";
import RevisionDiffView, { type RevisionVersion } from "./revision-diff-view";
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
  cover_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  cover_source_url: string | null;
  cover_license_url: string | null;
  cover_caption: string | null;
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
  if (query.created) return <Notice tone="success" role="status">The article was saved, but it is not public yet. Press “Publish now” below to put it live.</Notice>;
  if (query.saved) return <Notice tone="success" role="status">The story was saved, but it is not public yet. Press “Publish now” below to put it live.</Notice>;
  if (query.submitted) return <Notice tone="success" role="status">Version status updated. Publication is a separate, audited action.</Notice>;
  if (query.reviewed) return <Notice tone="success" role="status">The version status was updated. Publication is a separate, audited action.</Notice>;
  if (query.published) return <Notice tone="success" role="status">Published. The story is live on the public site right now.</Notice>;
  if (query.breaking) return <Notice tone="success" role="status">Breaking news status updated.</Notice>;
  if (query.tags) return <Notice tone="success" role="status">Topic tags were saved. The public story now shows the new topics.</Notice>;
  if (query.unpublished) return <Notice tone="neutral" role="status">Article unpublished.</Notice>;
  if (query.revised) return <Notice tone="success" role="status">A new private revision was created. The existing public version is unchanged.</Notice>;
  if (query.error) {
    const message =
      query.error === "uncertain"
        ? "We could not confirm whether your changes were saved or published. Check the article and its revision before trying again."
        : query.error === "breaking"
        ? "Breaking status could not be updated. Check publication access, expiry and revision, then reload and try again."
        : query.error === "cover"
        ? "Use one cover source. A linked cover needs a safe HTTPS image URL, alt text, credit, source page and license URL."
        : query.error === "save"
          ? "The story could not be saved. It may have changed; reload before trying again."
          : query.error === "published"
            ? "The article was not published. Check article.publish access and reload for revision changes."
            : query.error === "unpublished"
              ? "The article could not be unpublished. Check the revision and your article.unpublish access."
              : query.error === "unpublish_confirmation"
                ? "Confirm that you want to take down the version currently visible to readers."
                : query.error === "delete_confirmation"
                  ? "Tick the confirm box, then press Yes, delete forever."
                  : query.error === "delete"
                    ? "The story could not be deleted. Check your article access, reload and try again."
                    : query.error === "revise"
                      ? "A new private revision could not be created. Check article.create access and reload."
                      : query.error === "tags"
                        ? "The topic tags could not be saved. Use 2–12 topics of 2–40 characters, then try again."
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
  const [{ id }, query, supabase] = await Promise.all([params, searchParams, createStaffClient()]);
  if (!UUID.test(id)) notFound();

  const [articleResult, categoryResult, authorResult, createCapability, publishCapability, unpublishCapability, sessionResult] = await Promise.all([
    supabase.from("articles").select(`
      id, slug, revision, current_version_id, published_version_id, published_at, is_breaking, breaking_until,
        current_version:article_versions!current_version_id(
        id,title,summary,body,state,version_number,author_id,category_id,created_by,seo_title,seo_description,
        cover_url,cover_alt,cover_credit,cover_source_url,cover_license_url,cover_caption
      )
    `).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.rpc("has_capability", { p_capability: "article.publish" }),
    supabase.rpc("has_capability", { p_capability: "article.unpublish" }),
    supabase.auth.getUser(),
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
    is_breaking: boolean;
    breaking_until: string | null;
    current_version: ArticleVersion | ArticleVersion[] | null;
  };
  const version = Array.isArray(article.current_version) ? article.current_version[0] : article.current_version;
  if (!version) notFound();
  const [tagResult, reviewCapability, versionsResult] = await Promise.all([
    supabase.from("article_version_tags").select("tags(label)").eq("version_id", version.id).limit(12),
    supabase.rpc("has_capability", { p_capability: "article.review" }),
    supabase.from("article_versions").select("id,version_number,title,summary,body,state,created_at").eq("article_id", id).order("version_number", { ascending: false }).limit(20),
  ]);
  const articleTags = ((tagResult.data ?? []) as unknown as { tags?: { label?: string } | { label?: string }[] | null }[])
    .map((row) => Array.isArray(row.tags) ? row.tags[0]?.label ?? "" : row.tags?.label ?? "")
    .filter(Boolean);
  const canReviewTags = reviewCapability.data === true;
  const versions = (versionsResult.data ?? []) as unknown as RevisionVersion[];
  const requestedBefore = versions.find((row) => row.id === query.revisionA);
  const requestedAfter = versions.find((row) => row.id === query.revisionB);
  const diffBefore = requestedBefore ?? (versions.length > 1 ? versions[1] : null);
  const diffAfter = requestedAfter ?? (versions.length > 0 ? versions[0] : null);

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

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow={`Newsroom · Revision ${article.revision}`} title={version.title} description={<>Current version: <StatusBadge tone={displayTone}>{displayState}</StatusBadge>. {currentVersionIsPublic ? "This version is public." : olderVersionRemainsPublic ? "The previously published version remains live; this current version is private." : "No version of this article is public yet."}</>} actions={<Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>} meta={<><span>Revision {article.revision}</span><span>Slug: {article.slug}</span></>} />
      {Object.keys(query).some((key) => ["created", "saved", "submitted", "reviewed", "published", "unpublished", "revised", "breaking", "error"].includes(key)) ? <NewsroomToast key={JSON.stringify(query)}><StatusMessage query={query} /></NewsroomToast> : null}
      {article.published_version_id ? <Notice tone="neutral"><a href={publicNewsArticleUrl(article.slug)} className="ui-text-link">Open public article</a>{article.published_at ? <span className="ui-meta">Published {new Date(article.published_at).toLocaleDateString("en-NG")}</span> : null}</Notice> : null}

      {currentVersionIsPublic ? <NewsShareTools title={version.title} summary={version.summary} url={publicNewsArticleUrl(article.slug)} imageUrl={publishedNewsCover(version)?.url ? new URL(publishedNewsCover(version)!.url, absoluteUrl("/")).toString() : null} /> : null}

      {editablePrivateVersion || canCreateRevision ? (
        !referencesAvailable ? <EmptyPanel title="Bylines and categories unavailable" description="The article was not changed. Reload after the reference lists can be verified." /> : (
          <Panel>
            <SectionHeading eyebrow={editablePrivateVersion ? "Edit and publish" : "Correct and publish"} title={editablePrivateVersion ? "Edit this story" : "Correct the live story"} description="Saving publishes immediately — readers see the update the moment you press the button." />
            <ProgressiveEditor action={editablePrivateVersion ? saveDraft : reviseArticle} feedbackAction={editablePrivateVersion ? saveDraftWithFeedback : reviseArticleWithFeedback} recoveryActor={sessionResult.error ? undefined : sessionResult.data.user?.id} articleId={article.id} revision={String(article.revision)} submitLabel={editablePrivateVersion ? "Save & publish" : "Save correction & publish"} intent={editablePrivateVersion ? "save" : undefined} steps={[
              { title: "Story details", content: <>
              <div className="ui-field"><label className="label" htmlFor="title">Headline</label><input id="title" name="title" className="input" maxLength={200} required defaultValue={version.title} /></div>
              <div className="ui-field"><label className="label" htmlFor="summary">Summary</label><textarea id="summary" name="summary" className="input" rows={3} maxLength={1000} defaultValue={version.summary ?? ""} /></div>
              <div className="ui-field"><label className="label" htmlFor="body">Article body</label><textarea id="body" name="body" className="input" rows={14} maxLength={100000} required defaultValue={bodyForEditor(version.body)} /><p className="ui-meta">Use plain text with a blank line between paragraphs, or the structured document already shown.</p></div>
              </> },
              { title: "Category and author", content: <>
              <div className="ui-form-grid">
                <div className="ui-field"><label className="label" htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" className="input" required defaultValue={version.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>
                <div className="ui-field"><AuthorPicker authors={authors} initialId={version.author_id} /></div>
              </div>
              </> },
              { title: "Cover and search", content: <>
              <NewsCoverUrlFields idPrefix="edit-cover" uploadAvailable={coverUploadState().state === "ready"} initial={{ url: version.cover_url, alt: version.cover_alt, credit: version.cover_credit, sourceUrl: version.cover_source_url, licenseUrl: version.cover_license_url, caption: version.cover_caption }} />
              <div className="ui-form-grid">
                <div className="ui-field"><label className="label" htmlFor="seoTitle">Search title</label><input id="seoTitle" name="seoTitle" className="input" maxLength={70} defaultValue={version.seo_title ?? ""} /></div>
                <div className="ui-field"><label className="label" htmlFor="seoDescription">Search description</label><input id="seoDescription" name="seoDescription" className="input" maxLength={200} defaultValue={version.seo_description ?? ""} /></div>
              </div>
              </> },
            ]} />
          </Panel>
        )
      ) : <EmptyPanel title="This version is read-only" description="Your current access does not allow editing this version or creating a private correction." />}

      {!currentVersionIsPublic && canPublishCurrentVersion ? <Panel>
        <SectionHeading eyebrow="Publication" title="Publish now" description="Publishing makes the current version publicly visible immediately." />
        {canPublish ? <><p className="ui-muted">No second reviewer is required; every save normally publishes on its own. Publish here if a save ended up private — the database checks your verified session and records the action in the audit log.</p><form action={publishArticle} className="ui-actions"><input type="hidden" name="articleId" value={article.id} /><input type="hidden" name="revision" value={String(article.revision)} /><SubmitButton pendingLabel="Publishing…" className={buttonClassName("primary")}>Publish now</SubmitButton></form></> : <p className="ui-muted">This account does not have article.publish access.</p>}
      </Panel> : null}
      {hasPublishedVersion ? <Panel>
        <SectionHeading eyebrow="Publication" title="Breaking news" description="Show this story in the blue breaking-news banner for a while. You can have several breaking stories at once - each one slides in the banner until its time runs out. This never makes an unpublished story public." />
        {article.is_breaking && article.breaking_until && new Date(article.breaking_until).getTime() > Date.now()
          ? <p className="ui-muted">Breaking until <time dateTime={article.breaking_until}>{new Date(article.breaking_until).toLocaleString('en-NG')}</time>. Pause it below to take it out of the banner now.</p>
          : <p className="ui-muted">Not currently marked as breaking.</p>}
        {canPublish ? <div className="ui-stack">
          <form action={setArticleBreaking} className="ui-stack">
            <input type="hidden" name="articleId" value={article.id} /><input type="hidden" name="revision" value={String(article.revision)} /><input type="hidden" name="operation" value="enable" />
            <div className="ui-field"><label className="label" htmlFor="breaking-duration">Show for</label><select className="input" id="breaking-duration" name="duration" defaultValue="6"><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></div>
            <div className="ui-actions"><SubmitButton pendingLabel="Publishing…" className={buttonClassName("primary")}>Show as breaking news</SubmitButton></div>
          </form>
          {article.is_breaking ? <form action={setArticleBreaking} className="ui-actions"><input type="hidden" name="articleId" value={article.id} /><input type="hidden" name="revision" value={String(article.revision)} /><input type="hidden" name="operation" value="disable" /><SubmitButton pendingLabel="Pausing…" className={buttonClassName("secondary")}>Pause breaking news</SubmitButton></form> : null}
        </div> : <p className="ui-muted">This account does not have article.publish access.</p>}
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
          <div className="ui-actions"><SubmitButton pendingLabel="Taking down…" className={buttonClassName("secondary")}>Unpublish public article</SubmitButton></div>
        </form> : <p className="ui-muted">This account does not have article.unpublish access.</p>}
      </Panel> : null}
      {canReviewTags ? <Panel className="ui-subtle">
        <div className="ui-stack-sm">
          <div><p className="ui-eyebrow">Public story</p><h2 className="text-lg font-semibold">Topic tags</h2></div>
          <p className="ui-muted">Comma-separated topics, up to 12. Readers can filter the news page by these tags.{currentVersionIsPublic ? "" : " Tags apply to the current version and appear publicly once this version is published."}</p>
          <form action={saveArticleTags} className="ui-stack-sm">
            <input type="hidden" name="articleId" value={article.id} />
            <label className="ui-field"><span className="ui-label">Topics</span>
            <input className="input" type="text" name="tags" defaultValue={articleTags.join(", ")} placeholder="e.g. markets, flooding, education" maxLength={600} /></label>
            <div className="ui-actions"><SubmitButton pendingLabel="Saving…" className={buttonClassName("primary")}>Save topics</SubmitButton></div>
          </form>
        </div>
      </Panel> : null}
      {canReviewTags && versions.length > 1 && diffBefore && diffAfter ? <Panel className="ui-subtle">
        <div className="ui-stack-sm">
          <div><p className="ui-eyebrow">History</p><h2 className="text-lg font-semibold">Revision diff</h2></div>
          <p className="ui-muted">Pick any two saved revisions to compare headlines, summaries and body paragraphs.</p>
          <form method="get" className="ui-row">
            <label className="ui-field"><span className="ui-label">Older revision</span>
              <select className="input" name="revisionA" defaultValue={diffBefore.id}>
                {versions.map((row) => <option key={row.id} value={row.id}>Revision {row.version_number} · {row.state}</option>)}
              </select></label>
            <label className="ui-field"><span className="ui-label">Newer revision</span>
              <select className="input" name="revisionB" defaultValue={diffAfter.id}>
                {versions.map((row) => <option key={row.id} value={row.id}>Revision {row.version_number} · {row.state}</option>)}
              </select></label>
            <div className="ui-actions"><button className={buttonClassName("secondary")} type="submit">Compare</button></div>
          </form>
          <RevisionDiffView before={diffBefore} after={diffAfter} />
        </div>
      </Panel> : null}
    </PageFrame>
  );
}
