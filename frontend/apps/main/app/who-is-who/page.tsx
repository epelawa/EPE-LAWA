import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatIsoDay } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { UsersIcon } from "../../components/icons";

/**
 * Who is Who — directory index.
 *
 * Reads `published_people`, the public read model. The base `people` table only grants a visitor
 * the columns it intends them to see, and `people_verifications` grants the badge and the date but
 * not the reviewer or the note. That means the badge below is evidence, not decoration.
 *
 * A profile with no office still appears: a person is not their job title.
 */

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

type OfficeListItem = {
  person_id: string;
  title: string;
  institution: string;
  term_start: string | null;
  term_end: string | null;
  is_current: boolean;
};

export const metadata: Metadata = {
  title: "Who is Who",
  description:
    "People and public office holders in Epe Division, with a recorded source behind every profile.",
  alternates: { canonical: "/who-is-who" },
};

/**
 * The directory is capped rather than paginated for now, same reasoning as the news index: a page
 * that silently stops at N with no "load more" must say so, which the footer line below does.
 */
const PAGE_SIZE = 60;

export default async function WhoIsWhoPage({ searchParams }: { searchParams: Promise<{ name?: string; office?: string; community?: string }> }) {
  const filters = await searchParams;
  const clean = (value: string | undefined) => (value ?? "").trim().slice(0, 100).replace(/[^\p{L}\p{N} .'’-]/gu, " ");
  const nameFilter = clean(filters.name);
  const officeFilter = clean(filters.office);
  const communityFilter = filters.community ?? "";
  const supabase = await createClient();
  let officePersonIds: string[] | null = null;
  if (officeFilter) {
    const { data: matchingOffices, error: officeError } = await supabase
      .from("people_offices").select("person_id")
      .or(`title.ilike.%${officeFilter}%,institution.ilike.%${officeFilter}%`).limit(500);
    if (officeError) console.error("people_offices filter failed", { code: officeError.code });
    officePersonIds = [...new Set((matchingOffices ?? []).map((row) => row.person_id))];
  }
  let query = supabase.from("published_people")
    .select("id,slug,full_name,preferred_name,community,is_deceased,is_verified,portrait_key,portrait_alt")
    .order("full_name", { ascending: true }).limit(PAGE_SIZE);
  if (nameFilter) query = query.or(`full_name.ilike.%${nameFilter}%,preferred_name.ilike.%${nameFilter}%`);
  if (["eko_epe", "ijebu_epe", "other"].includes(communityFilter)) query = query.eq("community", communityFilter);
  if (officePersonIds) query = officePersonIds.length ? query.in("id", officePersonIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  const { data, error } = await query;

  if (error) {
    console.error("published_people list read failed", { code: error.code });

    return (
      <div className="ep-container py-12">
        <header className="mb-8">
          <p className="page-header__eyebrow">Who is Who</p>
          <h1 className="text-3xl font-bold tracking-tight">Who is Who</h1>
        </header>
        <div className="card p-6">
          <h2 className="text-lg font-bold">The directory did not load</h2>
          <p className="mt-2 text-muted-foreground">
            We could not reach the directory, so nothing is shown rather than a partial list that
            would read as missing people. Nothing has changed on your side.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Reload the page, or{" "}
            <Link href="/" className="text-primary underline underline-offset-4">
              return to the homepage
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const people = (data ?? []) as PersonListItem[];

  /**
   * Offices are fetched in one `in` query for the whole page, not one per person. Sixty profiles
   * at one query each is a sixty-query page: the first reader of the directory would pay for it
   * and so would the database.
   */
  const officesByPerson = new Map<string, OfficeListItem[]>();

  if (people.length > 0) {
    const { data: offices, error: officesError } = await supabase
      .from("people_offices")
      .select("person_id,title,institution,term_start,term_end,is_current")
      .in(
        "person_id",
        people.map((person) => person.id),
      )
      .order("is_current", { ascending: false })
      .order("term_start", { ascending: false, nullsFirst: false });

    if (officesError) {
      // Losing the offices degrades the card, it does not empty the directory. The profile links
      // still resolve and each profile loads its own offices, so the reader can still get there.
      console.error("people_offices list read failed", { code: officesError.code });
    } else {
      for (const office of (offices ?? []) as OfficeListItem[]) {
        const list = officesByPerson.get(office.person_id);
        if (list) list.push(office);
        else officesByPerson.set(office.person_id, [office]);
      }
    }
  }

  return (
    <div className="ep-container py-12">
      <header className="mb-10">
        <p className="page-header__eyebrow">Who is Who</p>
        <h1 className="text-3xl font-bold tracking-tight">Who is Who</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          People and public office holders in Epe Division. Every profile rests on at least one
          recorded source; the badge means a member of the editorial team checked that source and
          recorded when.
        </p>
      </header>

      <form method="get" action="/who-is-who" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filter people">
        <label className="grid gap-1 text-sm font-medium">Name<input className="rounded-md border bg-background px-3 py-2" name="name" defaultValue={nameFilter} maxLength={100} /></label>
        <label className="grid gap-1 text-sm font-medium">Office or institution<input className="rounded-md border bg-background px-3 py-2" name="office" defaultValue={officeFilter} maxLength={100} /></label>
        <label className="grid gap-1 text-sm font-medium">Community<select className="rounded-md border bg-background px-3 py-2" name="community" defaultValue={communityFilter}><option value="">All communities</option><option value="eko_epe">Eko Epe</option><option value="ijebu_epe">Ijebu Epe</option><option value="other">Other</option></select></label>
        <div className="flex items-end gap-2"><button className="btn-primary" type="submit">Search</button><Link className="btn-ghost" href="/who-is-who">Clear</Link></div>
      </form>
      {people.length === 0 ? (
        <div className="card p-8 text-center">
          <UsersIcon size={32} className="mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">No profiles published yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            {nameFilter || officeFilter || communityFilter ? "No published profiles match these filters. Try another search." : "No profile appears here until it has been written, sourced and published. Inventing an entry to fill the page would be worse than the empty page."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((person) => {
            const name = person.preferred_name || person.full_name;
            const portrait = publicMediaUrl(person.portrait_key);
            const offices = officesByPerson.get(person.id) ?? [];

            return (
              <li key={person.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {portrait ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={portrait}
                        alt={person.portrait_alt || person.full_name}
                        className="h-14 w-14 rounded-md border object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <UsersIcon size={22} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-snug">
                      <Link
                        href={`/who-is-who/${person.slug}`}
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {name}
                      </Link>
                    </h2>

                    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                      <span>{person.community || "Community not recorded"}</span>
                      {person.is_deceased ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="italic">Deceased</span>
                        </>
                      ) : null}
                    </p>

                    {person.is_verified ? (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-green-700)]">
                        Verified
                      </p>
                    ) : null}

                    {offices.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {offices.map((office) => {
                          const start = formatIsoDay(office.term_start);
                          const end = formatIsoDay(office.term_end);
                          const years = office.is_current
                            ? start
                              ? `${start} – present`
                              : "Current"
                            : start || end
                              ? `${start ?? "start not recorded"} – ${end ?? "end not recorded"}`
                              : null;

                          return (
                            <li
                              key={`${office.person_id}-${office.title}-${office.term_start ?? "x"}`}
                              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {office.title}
                              {office.institution ? `, ${office.institution}` : ""}
                              {years ? ` · ${years}` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {people.length === PAGE_SIZE ? (
        <p className="mt-8 text-sm text-muted-foreground">Showing up to {PAGE_SIZE} matching profiles. Refine your filters to narrow results.</p>
      ) : null}
    </div>
  );
}
