import type { Metadata } from "next";
import Link from "next/link";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { NewspaperIcon } from "../../components/icons";
import { NewsFeatureStatus } from "../../components/news-feature-status";
import { EmptyPanel, PageFrame, PageIntro, Panel, StatusBadge, TextLink } from "../../components/design-system";

type ArticleListItem = { slug: string; title: string; summary: string | null; published_at: string | null; is_breaking: boolean; breaking_until: string | null; author_name: string; category_label: string };
export const metadata: Metadata = { title: "News", description: "Reporting from Epe Division, Lagos State — at home and abroad.", alternates: { canonical: "/news" } };
const PAGE_SIZE = 30;
function isBreakingNow(item: ArticleListItem): boolean { return !!item.is_breaking && !!item.breaking_until && new Date(item.breaking_until).getTime() > Date.now(); }
function LoadError() { return <PageFrame className="ui-stack"><PageIntro eyebrow="Newsroom" title="EPE LAWA News" description="Reporting from Epe Division, Lagos State — at home and abroad."/><NewsFeatureStatus/><Panel><EmptyPanel title="The newsroom did not load" description={<>We could not reach the newsroom to fetch today’s stories, so nothing is shown rather than a guess. Nothing has changed on your side.</>} actions={<><Link href="/news" className="btn-secondary">Reload the page</Link><Link href="/" className="btn-ghost">Return to the homepage</Link></>}/></Panel></PageFrame>; }
export default async function NewsPage() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); } catch (error) { if (!(error instanceof SupabaseConfigurationError)) throw error; return <LoadError/>; }
  const { data, error } = await supabase.from("published_articles").select("slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_label").order("published_at", { ascending: false, nullsFirst: false }).limit(PAGE_SIZE);
  if (error) { console.error("published_articles list read failed", { code: error.code }); return <LoadError/>; }
  const articles = (data ?? []) as ArticleListItem[];
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Newsroom · Epe Division" title="EPE LAWA News" description="Reporting from Epe Division, Lagos State — at home and abroad. Every story carries a named byline, a publication date and a route back to the newsroom for corrections." meta={<span>Independent reporting, clearly attributed</span>}/>
    <NewsFeatureStatus/>
    {articles.length === 0 ? <Panel><EmptyPanel icon={<NewspaperIcon size={28}/>} title="No stories published yet" description="The newsroom is being built. When a story is published it appears here with its byline, date and category — nothing is shown before it exists."/></Panel> : <section className="ui-stack-sm" aria-label="Latest stories">
      <div className="ui-section-heading"><div><p className="ui-eyebrow">Latest reporting</p><h2>Stories from the newsroom</h2></div><span className="ui-meta">Most recent first</span></div>
      <ul className="ui-list ui-results">{articles.map(article => { const date = formatPublishedDate(article.published_at); const breaking = isBreakingNow(article); return <li key={article.slug} className="ui-item"><div className="ui-row ui-meta"><StatusBadge>{article.category_label}</StatusBadge>{breaking ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div><h3 className="ui-item-title"><Link href={`/news/${article.slug}`} className="hover:underline underline-offset-4">{article.title}</Link></h3>{article.summary ? <p className="ui-muted">{article.summary}</p> : null}<p className="ui-meta"><span className="font-medium text-foreground">By {article.author_name}</span>{date ? <><span aria-hidden="true">·</span><time dateTime={article.published_at ?? undefined}>{date}</time></> : null}</p><TextLink href={`/news/${article.slug}`}>Read story</TextLink></li>; })}</ul>
    </section>}
    {articles.length === PAGE_SIZE ? <p className="ui-meta">Showing the {PAGE_SIZE} most recent stories. Older stories are not listed on this page yet.</p> : null}
  </PageFrame>;
}
