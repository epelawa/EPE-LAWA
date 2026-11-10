import type { Metadata } from "next";
import Link from "next/link";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { FilterIcon, NewspaperIcon, SearchIcon } from "../../components/icons";
import { NewsFeatureStatus } from "../../components/news-feature-status";
import { EmptyPanel, PageFrame, PageIntro, Panel, StatusBadge, TextLink } from "../../components/design-system";

type ArticleListItem = { slug: string; title: string; summary: string | null; published_at: string | null; is_breaking: boolean; breaking_until: string | null; author_name: string; category_label: string };
type SearchParams = { q?: string | string[]; page?: string | string[] };
export const metadata: Metadata = { title: "News", description: "Reporting from Epe Division, Lagos State — at home and abroad.", alternates: { canonical: "/news" } };
const PAGE_SIZE = 30;
const MAX_PAGE = 1000;
function isBreakingNow(item: ArticleListItem): boolean { return !!item.is_breaking && !!item.breaking_until && new Date(item.breaking_until).getTime() > Date.now(); }
function escapeLike(value: string): string { return value.replace(/[\\%_]/g, "\\$&"); }
function safePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}
function pageHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/news?${suffix}` : "/news";
}
function LoadError() { return <PageFrame className="ui-stack"><PageIntro eyebrow="Newsroom" title="EPE LAWA News" description="Reporting from Epe Division, Lagos State — at home and abroad."/><NewsFeatureStatus/><Panel><EmptyPanel title="The newsroom did not load" description={<>We could not reach the newsroom to fetch today’s stories, so nothing is shown rather than a guess. Nothing has changed on your side.</>} actions={<><Link href="/news" className="btn-secondary">Reload the page</Link><Link href="/" className="btn-ghost">Return to the homepage</Link></>}/></Panel></PageFrame>; }

export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = safePage(params.page);
  const start = (page - 1) * PAGE_SIZE;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); } catch (error) { if (!(error instanceof SupabaseConfigurationError)) throw error; return <LoadError/>; }
  let request = supabase.from("published_articles").select("slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_label").order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true });
  if (query) request = request.ilike("title", `%${escapeLike(query)}%`);
  const { data, error } = await request.range(start, start + PAGE_SIZE);
  if (error) { console.error("published_articles list read failed", { code: error.code }); return <LoadError/>; }
  const rows = (data ?? []) as ArticleListItem[];
  const hasOlder = rows.length > PAGE_SIZE && page < MAX_PAGE;
  const articles = rows.slice(0, PAGE_SIZE);
  const storyLabel = query ? `Stories matching “${query}”` : "Stories from the newsroom";
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Newsroom" title="EPE LAWA News" description="Reporting from Epe Division, Lagos State — at home and abroad. Every story carries a named byline, a publication date and a route back to the newsroom for corrections." meta={<span>Independent reporting, clearly attributed</span>}/>
    <form action="/news" method="get" role="search" aria-label="Search newsroom" className="ui-toolbar ui-form-grid filter-panel">
      <div className="filter-panel__heading"><span className="filter-panel__icon"><FilterIcon/></span><div><p className="ui-eyebrow">Newsroom search</p><h2 className="filter-panel__title">Find a story</h2></div></div>
      <div className="ui-field"><label className="label" htmlFor="news-query">Search story headlines</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="news-query" name="q" defaultValue={query} maxLength={100} autoComplete="off" className="input" placeholder="Enter a headline or keyword"/></div></div>
      <div className="ui-actions"><button className="btn-primary" type="submit"><SearchIcon size={16}/>Search news</button>{query ? <Link className="btn-secondary" href="/news">Clear search</Link> : null}</div>
    </form>
    <NewsFeatureStatus/>
    {articles.length === 0 ? <Panel><EmptyPanel icon={<NewspaperIcon size={28}/>} title={query ? "No stories match this search" : page > 1 ? "No stories on this page" : "No stories published yet"} description={query ? "No published story title matched your search. Try a different term or clear the search." : page > 1 ? "There are no older published stories on this page." : "When a story is published it appears here with its byline, date and category — nothing is shown before it exists."} actions={query ? <Link href="/news" className="btn-secondary">Clear search</Link> : undefined}/></Panel> : <section className="ui-stack-sm" aria-label="Latest stories">
      <div className="ui-section-heading"><div><p className="ui-eyebrow">Latest reporting</p><h2>{storyLabel}</h2></div><span className="ui-meta">Most recent first · page {page}</span></div>
      <ul className="ui-list ui-results">{articles.map(article => { const date = formatPublishedDate(article.published_at); const breaking = isBreakingNow(article); const href = `/news/${encodeURIComponent(article.slug)}`; return <li key={article.slug} className="ui-item"><div className="ui-row ui-meta"><StatusBadge>{article.category_label}</StatusBadge>{breaking ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div><h3 className="ui-item-title"><Link href={href} className="hover:underline underline-offset-4">{article.title}</Link></h3>{article.summary ? <p className="ui-muted">{article.summary}</p> : null}<p className="ui-meta"><span className="font-medium text-foreground">By {article.author_name}</span>{date ? <><span aria-hidden="true">·</span><time dateTime={article.published_at ?? undefined}>{date}</time></> : null}</p><TextLink href={href}>Read story</TextLink></li>; })}</ul>
    </section>}
    {page > 1 || hasOlder ? <nav className="ui-actions" aria-label="News pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query)}>Newer stories</Link> : null}<span className="ui-meta" aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query)}>Older stories</Link> : null}</nav> : null}
  </PageFrame>;
}
