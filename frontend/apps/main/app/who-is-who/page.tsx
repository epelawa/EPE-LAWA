import type { Metadata } from "next";
import Link from "next/link";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatIsoDay } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { FilterIcon, SearchIcon, UsersIcon } from "../../components/icons";
import { EmptyPanel, Notice, PageFrame, PageIntro, StatusBadge } from "../../components/design-system";

type PersonListItem = {
  id: string;
  slug: string;
  full_name: string;
  preferred_name: string | null;
  community: string | null;
  is_deceased: boolean;
  is_verified: boolean;
  portrait_key: string | null;
  portrait_alt: string | null;
};
type OfficeListItem = { person_id: string; title: string; institution: string; term_start: string | null; term_end: string | null; is_current: boolean };
type SearchParams = { name?: string | string[]; office?: string | string[]; community?: string | string[]; page?: string | string[] };

export const metadata: Metadata = {
  title: "Who is Who",
  description: "People and public office holders, with a recorded source behind every profile.",
  alternates: { canonical: "/who-is-who" },
};
const PAGE_SIZE = 60;
const MAX_PAGE = 1000;
function first(value: string | string[] | undefined): string { return typeof value === "string" ? value : ""; }
function cleanFilter(value: string | string[] | undefined): string { return first(value).trim().slice(0, 100).replace(/[^\p{L}\p{N} '\u2019-]/gu, " ").replace(/\s+/g, " ").trim(); }
function safePage(value: string | string[] | undefined): number {
  const raw = first(value);
  if (!/^\d{1,6}$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}
function pageHref(page: number, name: string, office: string, community: string): string {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (office) params.set("office", office);
  if (community) params.set("community", community);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/who-is-who?${suffix}` : "/who-is-who";
}

export default async function WhoIsWhoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const nameFilter = cleanFilter(filters.name);
  const officeFilter = cleanFilter(filters.office);
  const requestedCommunity = first(filters.community);
  const communityFilter = ["eko_epe", "ijebu_epe", "other"].includes(requestedCommunity) ? requestedCommunity : "";
  const page = safePage(filters.page);
  const start = (page - 1) * PAGE_SIZE;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) throw error;
    return <PageFrame className="ui-stack"><PageIntro eyebrow="People" title="Who is Who" description="A sourced directory of people and public office holders."/><EmptyPanel title="The directory is not configured" description="We cannot load public profiles right now. No profile information is being guessed." actions={<Link href="/" className="btn-secondary">Return to the homepage</Link>}/></PageFrame>;
  }

  let officePersonIds: string[] | null = null;
  let officeFilterCapped = false;
  if (officeFilter) {
    const { data: matchingOffices, error: officeError } = await supabase.from("people_offices").select("person_id")
      .or(`title.ilike.%${officeFilter}%,institution.ilike.%${officeFilter}%`).limit(501);
    if (officeError) {
      console.error("people_offices filter failed", { code: officeError.code });
      return <PageFrame className="ui-stack"><PageIntro eyebrow="People" title="Who is Who" description="A sourced directory of people and public office holders."/><EmptyPanel title="Office search could not be loaded" description="We could not check public office records, so we are not presenting an incomplete result as if it were complete." actions={<Link href={pageHref(1, nameFilter, officeFilter, communityFilter)} className="btn-secondary">Try again</Link>}/></PageFrame>;
    }
    const officeRows = matchingOffices ?? [];
    officeFilterCapped = officeRows.length > 500;
    officePersonIds = [...new Set(officeRows.slice(0, 500).map((row) => row.person_id))];
  }

  let query = supabase.from("published_people")
    .select("id,slug,full_name,preferred_name,community,is_deceased,is_verified,portrait_key,portrait_alt")
    .order("full_name", { ascending: true }).order("id", { ascending: true });
  if (nameFilter) query = query.or(`full_name.ilike.%${nameFilter}%,preferred_name.ilike.%${nameFilter}%`);
  if (communityFilter) query = query.eq("community", communityFilter);
  if (officePersonIds) query = officePersonIds.length ? query.in("id", officePersonIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  const { data, error } = await query.range(start, start + PAGE_SIZE);

  if (error) {
    console.error("published_people list read failed", { code: error.code });
    return <PageFrame className="ui-stack"><PageIntro eyebrow="People" title="Who is Who" description="A sourced directory of people and public office holders."/><EmptyPanel title="The directory did not load" description={<><p>We could not reach the directory, so nothing is shown rather than a partial list that would read as missing people. Nothing has changed on your side.</p><p className="mt-3">Reload the page, or <Link href="/" className="ui-text-link">return to the homepage</Link>.</p></>} actions={<Link href={pageHref(page, nameFilter, officeFilter, communityFilter)} className="btn-secondary">Reload directory</Link>}/></PageFrame>;
  }

  const rows = (data ?? []) as PersonListItem[];
  const hasOlder = rows.length > PAGE_SIZE && page < MAX_PAGE;
  const people = rows.slice(0, PAGE_SIZE);
  const hasFilters = Boolean(nameFilter || officeFilter || communityFilter);
  const officesByPerson = new Map<string, OfficeListItem[]>();
  if (people.length > 0) {
    const { data: offices, error: officesError } = await supabase.from("people_offices")
      .select("person_id,title,institution,term_start,term_end,is_current")
      .in("person_id", people.map((person) => person.id))
      .order("is_current", { ascending: false })
      .order("term_start", { ascending: false, nullsFirst: false });
    if (officesError) {
      console.error("people_offices list read failed", { code: officesError.code });
    } else {
      for (const office of (offices ?? []) as OfficeListItem[]) {
        const list = officesByPerson.get(office.person_id);
        if (list) list.push(office);
        else officesByPerson.set(office.person_id, [office]);
      }
    }
  }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="People" title="Who is Who" description="People and public office holders, with a recorded source behind every profile. The verified badge means a member of the editorial team checked and recorded a source." />
    <form method="get" action="/who-is-who" className="ui-toolbar ui-form-grid filter-panel" role="search" aria-label="Filter people">
      <div className="filter-panel__heading"><span className="filter-panel__icon"><FilterIcon/></span><div><p className="ui-eyebrow">Public profiles</p><h2 className="filter-panel__title">Find a person</h2></div></div>
      <label className="ui-field"><span className="label">Name</span><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input className="input" name="name" defaultValue={nameFilter} maxLength={100} autoComplete="off" aria-label="Name" /></div></label>
      <label className="ui-field"><span className="label">Office or institution</span><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input className="input" name="office" defaultValue={officeFilter} maxLength={100} autoComplete="off" aria-label="Office or institution" /></div></label>
      <label className="ui-field"><span className="label">Community</span><select className="input" name="community" defaultValue={communityFilter}><option value="">All communities</option><option value="eko_epe">Eko Epe</option><option value="ijebu_epe">Ijebu Epe</option><option value="other">Other</option></select></label>
      <div className="ui-actions"><button className="btn-primary" type="submit"><SearchIcon size={16}/>Search</button><Link className="btn-secondary" href="/who-is-who">Clear</Link></div>
    </form>
    {officeFilterCapped ? <Notice tone="warning" role="status">This office search matched more than 500 public office records. Results use the first 500 matches; narrow the office or institution term for a complete search.</Notice> : null}
    {people.length === 0 ? <EmptyPanel icon={<UsersIcon size={28} />} title={page > 1 ? "No profiles on this page" : hasFilters ? "No profiles match these filters" : "No profiles published yet"} description={page > 1 ? "There are no further matching profiles on this page." : hasFilters ? "No published profiles match these filters. Try another search or clear the filters." : "No profile appears here until it has been written, sourced and published. Inventing an entry to fill the page would be worse than the empty page."} actions={hasFilters ? <Link href="/who-is-who" className="btn-secondary">Clear filters</Link> : undefined} /> : <>
      <p className="ui-meta" aria-live="polite">Profiles {start + 1}–{start + people.length} · page {page}</p>
      <ul className="ui-grid ui-grid--2 ui-list">
        {people.map((person) => {
          const name = person.preferred_name || person.full_name;
          const portrait = publicMediaUrl(person.portrait_key);
          const offices = officesByPerson.get(person.id) ?? [];
          return <li key={person.id} className="ui-card">
            <div className="ui-row items-start">
              <div className="flex-shrink-0">{portrait ? <img src={portrait} alt={person.portrait_alt || person.full_name} className="h-16 w-16 rounded-xl border object-cover" loading="lazy" decoding="async" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><UsersIcon size={22} /></div>}</div>
              <div className="min-w-0">
                <h2 className="ui-item-title"><Link href={`/who-is-who/${encodeURIComponent(person.slug)}`} className="ui-text-link">{name}</Link></h2>
                <p className="ui-meta mt-1"><span>{person.community || "Community not recorded"}</span>{person.is_deceased ? <><span aria-hidden="true">·</span><StatusBadge tone="neutral">Deceased</StatusBadge></> : null}</p>
                {person.is_verified ? <p className="mt-2"><StatusBadge tone="success">Verified</StatusBadge></p> : null}
                {offices.length > 0 ? <ul className="ui-list ui-meta mt-3">{offices.map((office) => {
                  const startDay = formatIsoDay(office.term_start);
                  const endDay = formatIsoDay(office.term_end);
                  const years = office.is_current ? startDay ? `${startDay} – present` : "Current" : startDay || endDay ? `${startDay ?? "start not recorded"} – ${endDay ?? "end not recorded"}` : null;
                  return <li key={`${office.person_id}-${office.title}-${office.term_start ?? "x"}`} className="ui-tag">{office.title}{office.institution ? `, ${office.institution}` : ""}{years ? ` · ${years}` : ""}</li>;
                })}</ul> : null}
              </div>
            </div>
          </li>;
        })}
      </ul>
    </>}
    {page > 1 || hasOlder ? <nav className="ui-actions" aria-label="Who is Who pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, nameFilter, officeFilter, communityFilter)}>Previous profiles</Link> : null}<span className="ui-meta" aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, nameFilter, officeFilter, communityFilter)}>More profiles</Link> : null}</nav> : null}
  </PageFrame>;
}
