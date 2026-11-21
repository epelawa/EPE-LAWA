import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName, EmptyPanel, Notice, PageFrame, PageIntro } from "@epelawa/ui";
import { createClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import { coverUploadState } from "../../../../lib/media-r2";
import NewsArticleComposer from "../../../../components/news-article-composer";

export const metadata: Metadata = {
  title: "Publish an article",
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
  const [capabilityResult, sessionResult, categoryResult, authorResult] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "article.create" }),
    supabase.auth.getUser(),
    supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("authors").select("id,display_name").order("display_name").limit(100),
  ]);
  // Effective capabilities include assigned roles; article_create still enforces
  // authoritative authorization for every write.
  const canCreate = !capabilityResult.error && capabilityResult.data === true;
  const categories = (categoryResult.data ?? []) as ReferenceOption[];
  const authors = (authorResult.data ?? []) as ReferenceOption[];
  const accessCheckUnavailable = !!capabilityResult.error;
  const referencesFailed = !!categoryResult.error || !!authorResult.error;

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="Newsroom · Publish" title="Publish an article" description="Add the story, then publish — it goes live on the public site straight away." actions={<Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>} />
      {params.error ? <Notice tone="danger" role="alert">{params.error === "invalid" ? "Add a title, body, byline and category, then try again." : params.error === "uncertain" ? "We could not confirm whether the article was saved. Check the newsroom list before trying again to avoid a duplicate." : params.error === "cover" ? "Use one cover source. A linked cover needs a safe HTTPS image URL, alt text, credit, source page and license URL." : "The article could not be published. Check your access and try again."}</Notice> : null}
      {accessCheckUnavailable || !canCreate || referencesFailed || categories.length === 0 ? (
        <EmptyPanel title={accessCheckUnavailable ? "Newsroom authorization unavailable" : !canCreate ? "Article creation access required" : "Newsroom setup is incomplete"} description={accessCheckUnavailable ? "Your staff access could not be verified. No draft was created. Refresh and retry; if this continues, ask a system administrator to check the authorization service." : !canCreate ? "This staff account does not have the article.create capability." : referencesFailed ? "Categories and bylines could not be verified. No article was created." : "Add at least one active category before creating an article."} actions={<div className="ui-actions"><Link href={adminHref("/newsroom")} className={buttonClassName("secondary")}>Back to newsroom</Link>{!accessCheckUnavailable && canCreate && !referencesFailed && (categories.length === 0) ? <Link href={adminHref("/newsroom/settings")} className={buttonClassName("primary")}>Manage categories & bylines</Link> : null}</div>} />
      ) : (
        <NewsArticleComposer categories={categories} authors={authors} recoveryActor={sessionResult.error ? undefined : sessionResult.data.user?.id} coverUploadAvailable={coverUploadState().state === "ready"} />
      )}
    </PageFrame>
  );
}
