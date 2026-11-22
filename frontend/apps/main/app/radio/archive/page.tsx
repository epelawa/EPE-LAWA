import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { EmptyPanel, PageFrame } from "../../../components/design-system";
import styles from "../radio-page.module.css";

export const metadata: Metadata = {
  title: "Radio archive",
  description: "Past episodes and replayable programmes from EPE LAWA Radio.",
  alternates: { canonical: "/radio/archive" },
};

type EpisodeRow = {
  id: string;
  title: string;
  description: string | null;
  aired_on: string | null;
  external_url: string | null;
  programmes: Array<{ name: string } | undefined>;
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const MAX_PAGE = 100;

function safePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}

export default async function RadioArchivePage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = safePage(params.page);
  const start = (page - 1) * PAGE_SIZE;

  const db = await createClient();
  const query = db.from("episodes").select("id,title,description,aired_on,external_url,programmes(name)")
    .eq("publication_status", "published");
  const episodesResult = await (q ? query.ilike("title", `%${q}%`) : query)
    .order("aired_on", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(start, start + PAGE_SIZE);

  if (episodesResult.error) console.error("published episodes read failed", { code: episodesResult.error.code });
  const rows = (episodesResult.data ?? []) as EpisodeRow[];
  const episodes = rows.slice(0, PAGE_SIZE);
  const hasOlder = rows.length > PAGE_SIZE && page < MAX_PAGE;
  const pageHref = (number: number) => `/radio/archive?${new URLSearchParams({ ...(q ? { q } : {}), ...(number > 1 ? { page: String(number) } : {}) })}`;

  return <PageFrame className={`ui-stack ${styles.page}`}>
    <header className="ui-stack-sm">
      <nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/radio">Radio</Link><span aria-hidden="true"> / </span><span>Archive</span></nav>
      <p className="ui-eyebrow">EPE LAWA RADIO</p>
      <h1 className="text-2xl font-semibold">Programme archive</h1>
      <p className="ui-muted">Past episodes, newest first. Replay any published episode{q ? " or search the titles below" : ""}.</p>
    </header>

    <form action="/radio/archive" method="get" role="search" className="ui-actions">
      <label className="sr-only" htmlFor="archive-query">Search episode titles</label>
      <input className="input" id="archive-query" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search episodes…" />
      <button className="btn-secondary" type="submit">Search</button>
      {q ? <Link className="btn-ghost" href="/radio/archive">Clear</Link> : null}
    </form>

    {episodesResult.error ? <EmptyPanel
      title="The archive is unavailable"
      description="We could not reach the published archive, so no episodes are shown rather than a guess. Try again in a moment."
      actions={<Link href="/radio/archive" className="btn-secondary">Reload the archive</Link>}
    /> : !episodes.length ? <EmptyPanel
      title={q ? "No episodes match that search" : "No episodes published yet"}
      description={q ? "Try a shorter search, or browse without filters." : "When the radio desk publishes episodes, they are listed here to replay."}
      actions={<Link href="/radio/archive" className="btn-secondary">Browse all episodes</Link>}
    /> : <ul className="ui-list ui-stack-sm">{episodes.map(episode => {
      const programme = episode.programmes?.[0]?.name ?? null;
      const playable = Boolean(episode.external_url);
      return <li key={episode.id} className="ui-card ui-stack-sm">
        <div><h2 className="ui-item-title">{episode.title}</h2>
          <p className="ui-meta">{programme ?? "EPE LAWA Radio"}{episode.aired_on ? ` · aired ${new Date(episode.aired_on).toLocaleDateString("en-NG", { dateStyle: "long" })}` : ""}</p></div>
        {episode.description ? <p className="ui-muted">{episode.description}</p> : null}
        {playable ? <a className="btn-secondary w-fit" href={episode.external_url as string} target="_blank" rel="noopener noreferrer">Listen to this episode</a> : null}
      </li>;
    })}</ul>}

    {page > 1 || hasOlder ? <nav className="ui-actions" aria-label="Archive pages">
      {page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1)}>Newer episodes</Link> : null}
      <span className="ui-meta">Page {page}</span>
      {hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1)}>Older episodes</Link> : null}
    </nav> : null}
  </PageFrame>;
}
