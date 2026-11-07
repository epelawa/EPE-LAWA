import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatIsoDay } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { UsersIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, StatusBadge } from "../../components/design-system";

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
      <PageFrame className="ui-stack">
        <PageIntro eyebrow="People · Epe Division" title="Who is Who" description="A sourced directory of people and public office holders." />
        <EmptyPanel title="The directory did not load" description={<>
            <p>We could not reach the directory, so nothing is shown rather than a partial list that would read as missing people. Nothing has changed on your side.</p>
            <p className="mt-3">Reload the page, or <Link href="/" className="ui-text-link">return to the homepage</Link>.</p>
          </>} />
      </PageFrame>
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
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="People · Epe Division" title="Who is Who" description="People and public office holders in Epe Division. Every profile rests on at least one recorded source; the badge means a member of the editorial team checked that source and recorded when." />

      <form method="get" action="/who-is-who" className="ui-toolbar ui-form-grid" aria-label="Filter people">
        <label className="ui-field"><span className="label">Name</span><input className="input" name="name" defaultValue={nameFilter} maxLength={100} /></label>
        <label className="ui-field"><span className="label">Office or institution</span><input className="input" name="office" defaultValue={officeFilter} maxLength={100} /></label>
        <label className="ui-field"><span className="label">Community</span><select className="input" name="community" defaultValue={communityFilter}><option value="">All communities</option><option value="eko_epe">Eko Epe</option><option value="ijebu_epe">Ijebu Epe</option><option value="other">Other</option></select></label>
        <div className="ui-actions"><button className="btn-primary" type="submit">Search</button><Link className="btn-secondary" href="/who-is-who">Clear</Link></div>
      </form>
      {people.length === 0 ? (
        <EmptyPanel icon={<UsersIcon size={28} />} title="No profiles published yet" description={nameFilter || officeFilter || communityFilter ? "No published profiles match these filters. Try another search." : "No profile appears here until it has been written, sourced and published. Inventing an entry to fill the page would be worse than the empty page."} />
      ) : (
        <ul className="ui-grid ui-grid--2 ui-list">
          {people.map((person) => {
            const name = person.preferred_name || person.full_name;
            const portrait = publicMediaUrl(person.portrait_key);
            const offices = officesByPerson.get(person.id) ?? [];

            return (
              <li key={person.id} className="ui-card">
                <div className="ui-row items-start">
                  <div className="flex-shrink-0">
                    {portrait ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={portrait}
                        alt={person.portrait_alt || person.full_name}
                        className="h-16 w-16 rounded-xl border object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                        <UsersIcon size={22} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="ui-item-title">
                      <Link
                        href={`/who-is-who/${person.slug}`}
                        className="ui-text-link"
                      >
                        {name}
                      </Link>
                    </h2>

                    <p className="ui-meta mt-1">
                      <span>{person.community || "Community not recorded"}</span>
                      {person.is_deceased ? (
                        <>
                          <span aria-hidden="true">·</span>
                        <StatusBadge tone="neutral">Deceased</StatusBadge>
                        </>
                      ) : null}
                    </p>

                    {person.is_verified ? (
                      <p className="mt-2"><StatusBadge tone="success">Verified</StatusBadge></p>
                    ) : null}

                    {offices.length > 0 ? (
                      <ul className="ui-list ui-meta mt-3">
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
                              className="ui-tag"
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
        <p className="ui-meta">Showing up to {PAGE_SIZE} matching profiles. Refine your filters to narrow results.</p>
      ) : null}
    </PageFrame>
  );
}
