import Link from "next/link";
import { NewspaperIcon } from "../../components/icons";

/**
 * EPE LAWA News — publication landing page.
 *
 * News lives at /news/ on the main host until a dedicated news subdomain is
 * configured. Honest empty state — nothing published yet, nothing invented.
 */
export default function NewsPage() {
  return (
    <div className="min-h-screen bg-card text-foreground">
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">EPE LAWA News</h1>
              <p className="text-muted-foreground mt-2">
                Reporting from Epe Division, Lagos State — at home and abroad.
              </p>
            </div>
            <Link href="/" className="btn-ghost">
              Back to home
            </Link>
          </div>

          <div className="card p-8 text-center">
            <NewspaperIcon size={32} className="text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">No stories published yet</h2>
            <p className="text-muted-foreground">
              The newsroom is being built. When stories are published, they'll
              appear here with named sources, dates and correction notices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
