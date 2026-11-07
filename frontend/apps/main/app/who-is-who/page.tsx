import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { UsersIcon } from "../../components/icons";

/**
 * Who is Who directory index.
 *
 * Lists published people with their offices and communities. Honest empty state
 * when no profiles are published yet.
 */
export default async function WhoIsWhoPage() {
  const supabase = await createClient();

  const { data: people, error } = await supabase
    .from("people")
    .select(`
      id,
      slug,
      full_name,
      preferred_name,
      biography,
      is_deceased,
      community,
      people_offices (
        id,
        title,
        institution,
        term_start,
        term_end,
        is_current
      )
    `)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-card text-foreground">
        <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="prose">
            <h1 className="text-2xl font-bold tracking-tight mb-4">Who is Who</h1>
            <p className="text-[var(--color-error-700)] text-sm mb-6">
              The directory could not be loaded right now. Nothing has been
              changed on your side. Try again in a moment.
            </p>
            <a href="/" className="text-primary underline underline-offset-4">
              Return to homepage
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-card text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Who is Who
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Who is Who</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            People and public office holders in Epe Division. Every profile includes
            sources and verification details — nothing is claimed without a record.
          </p>
        </div>

        {people && people.length > 0 ? (
          <div className="space-y-4">
            {people.map((person: any) => (
              <div key={person.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      <UsersIcon size={20} />
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/who-is-who/${person.slug}`}
                      className="text-foreground font-medium text-lg hover:text-primary"
                    >
                      {person.preferred_name || person.full_name}
                    </Link>
                    {person.is_deceased && (
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        Deceased
                      </span>
                    )}
                    <p className="text-muted-foreground text-sm mt-1">
                      {person.community ||
                        "Community not recorded in source documents"}
                    </p>
                    {person.people_offices && person.people_offices.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {person.people_offices.map((office: any) => (
                          <span
                            key={office.id}
                            className="inline-block mt-1 px-2 py-0.5 rounded-md bg-secondary text-primary text-xs font-medium"
                          >
                            {office.title}{office.institution ? `, ${office.institution}` : ""}
                            {office.is_current ? " · current" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <UsersIcon size={32} className="text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground mb-2">
              No profiles published yet
            </h3>
            <p className="text-muted-foreground text-sm">
              The Who is Who directory is being built. No profiles have been published
              yet — every profile requires at least one recorded source before it can
              appear here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
