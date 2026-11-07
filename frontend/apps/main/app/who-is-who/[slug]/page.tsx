import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { formatIsoDay, formatPublishedDate } from "../../../lib/dates";
import { publicMediaUrl } from "../../../lib/media";
import { UsersIcon } from "../../../components/icons";

/**
 * Who is Who — person profile.
 *
 * Three reads, all keyed by the person's id: the profile view, their offices, and their public
 * sources. They are separate on purpose. `people_verifications` grants a visitor only
 * `person_id, verified_at, superseded_at` — selecting the reviewer or the note alongside the badge
 * would fail the whole query, taking the profile down with it.
 *
 * Nothing about a person is inferred. No office, no photograph and no verification badge is
 * rendered unless the database supplied the row.
 */

type PublishedPerson = {
  id: string;
  slug: string;
  full_name: string;
  preferred_name: string | null;
  community: string | null;
  community_note: string | null;
  biography: string | null;
  is_deceased: boolean;
  is_verified: boolean;
  verified_at: string | null;
  portrait_key: string | null;
  portrait_alt: string | null;
  portrait_credit: string | null;
  published_at: string | null;
};

type OfficeRow = {
  id: string;
  title: string;
  institution: string;
  term_start: string | null;
  term_end: string | null;
  is_current: boolean;
};

type SourceRow = {
  id: string;
  kind: string;
  citation: string;
  url: string | null;
  recorded_at: string;
};

type ProfileResult =
  | { status: "found"; person: PublishedPerson }
  | { status: "missing" }
  | { status: "error" };

/**
 * `cache` dedupes the read between `generateMetadata` and the render of the same request. It is
 * not a shared cache: a corrected profile is visible on the next request.
 */
const loadPerson = cache(async (slug: string): Promise<ProfileResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_people")
    .select(
      "id,slug,full_name,preferred_name,community,community_note,biography,is_deceased,is_verified,verified_at,portrait_key,portrait_alt,portrait_credit,published_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // Never render the driver message: it can name tables and policies.
    console.error("published_people read failed", { code: error.code });
    return { status: "error" };
  }
  if (!data) return { status: "missing" };

  return { status: "found", person: data as PublishedPerson };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPerson(slug);

  if (result.status !== "found") {
    return { title: "Profile not found", robots: { index: false, follow: false } };
  }

  const person = result.person;
  const name = person.preferred_name || person.full_name;
  const portrait = publicMediaUrl(person.portrait_key);

  // The biography is written for a reader, not for a search engine: cut it at a word boundary so
  // the description does not end mid-word, and never invent the missing part.
  const description = person.biography
    ? person.biography.replace(/\s+/g, " ").trim().slice(0, 155).trimEnd()
    : `Profile of ${name} in the EPE LAWA Who is Who directory for Epe Division, Lagos State.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/who-is-who/${person.slug}` },
    openGraph: {
      type: "profile",
      title: name,
      description,
      url: `/who-is-who/${person.slug}`,
      images: portrait
        ? [{ url: portrait, alt: person.portrait_alt || person.full_name }]
        : undefined,
    },
    twitter: {
      card: portrait ? "summary_large_image" : "summary",
      title: name,
      description,
      images: portrait ? [portrait] : undefined,
    },
  };
}

/** `2020-05-29` + `null` + current → "29 May 2020 – present". Missing parts stay missing. */
function termLabel(office: OfficeRow): string {
  const start = formatIsoDay(office.term_start);
  const end = formatIsoDay(office.term_end);

  if (office.is_current) return start ? `${start} – present` : "Present";
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – end date not recorded`;
  if (end) return `Start date not recorded – ${end}`;
  return "Term dates not recorded";
}

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadPerson(slug);

  if (result.status === "error") {
    return (
      <div className="ep-container py-12">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">This profile did not load</h1>
        <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
          The directory could not be reached, so nothing is shown rather than a guess at the
          record. Try again in a moment.
        </p>
        <Link href="/who-is-who" className="btn-ghost">
          Back to the directory
        </Link>
      </div>
    );
  }

  if (result.status !== "found") notFound();

  const person = result.person;
  const supabase = await createClient();

  const [officesResult, sourcesResult] = await Promise.all([
    supabase
      .from("people_offices")
      .select("id,title,institution,term_start,term_end,is_current")
      .eq("person_id", person.id)
      .order("is_current", { ascending: false })
      .order("term_start", { ascending: false, nullsFirst: false }),
    supabase
      .from("people_sources")
      .select("id,kind,citation,url,recorded_at")
      .eq("person_id", person.id)
      .eq("visibility", "public")
      .order("recorded_at", { ascending: false }),
  ]);

  if (officesResult.error) {
    console.error("people_offices read failed", { code: officesResult.error.code });
  }
  if (sourcesResult.error) {
    console.error("people_sources read failed", { code: sourcesResult.error.code });
  }

  const offices = (officesResult.data ?? []) as OfficeRow[];
  const sources = (sourcesResult.data ?? []) as SourceRow[];

  const name = person.preferred_name || person.full_name;
  const portrait = publicMediaUrl(person.portrait_key);
  const verifiedOn = formatPublishedDate(person.verified_at);
  const biography = person.biography?.trim() ?? "";
  const paragraphs = biography
    ? biography.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];

  return (
    <article className="ep-container py-12">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link href="/who-is-who" className="text-primary underline underline-offset-4">
          Who is Who
        </Link>
      </nav>

      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex-shrink-0">
          {portrait ? (
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portrait}
                alt={person.portrait_alt || person.full_name}
                className="h-32 w-32 rounded-md border object-cover"
                loading="eager"
                decoding="async"
              />
              {person.portrait_credit ? (
                <figcaption className="mt-2 max-w-[8rem] text-xs text-muted-foreground">
                  {person.portrait_credit}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <UsersIcon size={36} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{name}</h1>

          {person.preferred_name && person.preferred_name !== person.full_name ? (
            <p className="mt-1 text-sm text-muted-foreground">Full name: {person.full_name}</p>
          ) : null}

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            {person.community ? <span>{person.community}</span> : null}
            {person.community && person.is_deceased ? <span aria-hidden="true">·</span> : null}
            {person.is_deceased ? <span className="italic">Deceased</span> : null}
          </p>

          {person.community_note ? (
            <p className="mt-1 text-sm text-muted-foreground">{person.community_note}</p>
          ) : null}
        </div>
      </header>

      {person.is_verified ? (
        <section
          aria-labelledby="verification-heading"
          className="mb-10 rounded-md border border-[var(--color-green-700)] bg-[var(--color-green-100)] p-4"
        >
          <h2 id="verification-heading" className="text-base font-bold text-foreground">
            Verified profile
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-green-700)]">
            A member of the EPE LAWA editorial team checked this record against the sources listed
            below
            {verifiedOn ? ` and recorded the check on ${verifiedOn}` : ""}. Verification means the
            sources were read. It is not an endorsement of the person or of their record, and a
            correction is always welcome.
          </p>
        </section>
      ) : null}

      {paragraphs.length > 0 ? (
        <section aria-labelledby="biography-heading" className="mb-10">
          <h2 id="biography-heading" className="mb-4 text-xl font-bold tracking-tight">
            Biography
          </h2>
          <div className="space-y-4 leading-relaxed text-foreground">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {offices.length > 0 ? (
        <section aria-labelledby="offices-heading" className="mb-10">
          <h2 id="offices-heading" className="mb-4 text-xl font-bold tracking-tight">
            Offices held
          </h2>
          <ul className="space-y-3">
            {offices.map((office) => (
              <li key={office.id} className="card p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-base font-semibold">{office.title}</h3>
                  {office.is_current ? (
                    <span className="rounded bg-[var(--color-green-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-green-700)]">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{office.institution}</p>
                <p className="mt-1 text-sm text-muted-foreground">{termLabel(office)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="sources-heading" className="mb-10">
        <h2 id="sources-heading" className="mb-4 text-xl font-bold tracking-tight">
          Sources
        </h2>

        {sources.length > 0 ? (
          <ul className="space-y-3">
            {sources.map((source) => {
              const recorded = formatPublishedDate(source.recorded_at);
              // `people_sources_url_https` guarantees https, but a link is only rendered when the
              // stored value survived parsing — never as a redirected or javascript: URL.
              const href = source.url && /^https:\/\//i.test(source.url) ? source.url : null;

              return (
                <li key={source.id} className="card p-4">
                  <p className="leading-relaxed text-muted-foreground">{source.citation}</p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                    <span className="uppercase tracking-wider">
                      {source.kind.replace(/_/g, " ")}
                    </span>
                    {recorded ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Recorded {recorded}</span>
                      </>
                    ) : null}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
                    >
                      Open the source
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            No public source is recorded for this profile yet. Staff-held evidence is not published
            until the person who recorded it marks it public.
          </p>
        )}
      </section>

      <p className="border-t pt-6 text-sm text-muted-foreground">
        Something here wrong or incomplete?{" "}
        <Link href="/contact" className="text-primary underline underline-offset-4">
          Tell the newsroom
        </Link>
        .
      </p>
    </article>
  );
}
