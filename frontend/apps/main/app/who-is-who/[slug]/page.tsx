import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { UsersIcon } from "../../../components/icons";

/**
 * Who is Who person profile page.
 *
 * Shows the person's full biography, offices held with term dates, sources,
 * and verification badge. Honest empty states when no data exists.
 */
export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: person, error } = await supabase
    .from("people")
    .select(`
      id,
      slug,
      full_name,
      preferred_name,
      biography,
      is_deceased,
      community,
      status,
      published_at,
      people_offices (
        id,
        title,
        institution,
        term_start,
        term_end,
        is_current,
        source_id
      ),
      people_sources (
        id,
        kind,
        citation,
        url,
        recorded_at
      ),
      people_verifications (
        id,
        verified_by,
        verified_at,
        source_id,
        note
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error || !person) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="prose text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Profile not found</h2>
            <p className="text-slate-600 mb-6">
              The person you&rsquo;re looking for hasn&rsquo;t been published yet,
              or the address may be mistyped.
            </p>
            <a href="/who-is-who" className="text-blue-600 underline underline-offset-4">
              Return to directory
            </a>
          </div>
        </div>
      </main>
    );
  }

  const isCurrent = (office: { term_end: string | null }) =>
    !office.term_end || new Date(office.term_end) > new Date();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                <UsersIcon size={32} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {person.preferred_name || person.full_name}
              </h1>
              {person.is_deceased && (
                <span className="text-xs text-slate-400 ml-2 italic mt-1 inline-block">
                  Deceased
                </span>
              )}
              {person.community && (
                <p className="text-slate-600 text-sm mt-1">
                  {person.community}
                </p>
              )}
            </div>
          </div>

          {person.biography && (
            <div className="prose prose-sm text-slate-600 mt-6 max-w-none">
              {person.biography.split("\n\n").map((para: any, i: number) => (
                <p key={i} className="mb-4">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Offices */}
        {person.people_offices && person.people_offices.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Offices held
            </h2>
            <div className="space-y-3">
              {person.people_offices.map((office: any) => (
                <div
                  key={office.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 text-sm font-medium">
                    #
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {office.title}
                      </span>
                      {office.is_current && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {office.institution}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {office.term_start ? new Date(office.term_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Start date not recorded"}
                      {office.term_end ? ` — ${new Date(office.term_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : " — Present"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {person.people_sources && person.people_sources.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Sources
            </h2>
            <div className="space-y-3">
              {person.people_sources.map((source: any) => (
                <div key={source.id} className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {source.citation}
                  </p>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline underline-offset-4 hover:text-blue-700"
                    >
                      View source →
                    </a>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Recorded {new Date(source.recorded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification */}
        {person.people_verifications && person.people_verifications.length > 0 && (
          <div className="mb-10">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Verified
                </h2>
                <p className="text-sm text-green-700">
                  This profile has been verified against at least one recorded source.
                  Verification means a person at EPE LAWA checked the source and
                  recorded what they checked, who checked it, and when. It does not
                  mean endorsement of the person or their record.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-10">
          <Link href="/who-is-who" className="text-blue-600 hover:text-blue-700">
            ← Back to directory
          </Link>
        </div>
      </div>
    </main>
  );
}
