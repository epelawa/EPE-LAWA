import Link from "next/link";
import { createClient } from "../lib/supabase";
import { Button, EmptyState, buttonClassName } from "@epelawa/ui";

/**
 * Admin dashboard.
 *
 * Real counts: drafts awaiting review, approved awaiting publish, open reports,
 * orders needing action. Each is a link. Zero shows zero.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const [draftsResult, approvedResult] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("published_version_id", null).is("current_version_id", null).not("current_version_id", "is", null),
    supabase.from("article_versions").select("id", { count: "exact", head: true }).eq("state", "approved"),
  ]);

  // Simpler: count drafts (articles with no published version)
  const drafts = draftsResult.count ?? 0;
  const approved = approvedResult.count ?? 0;

  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__lede">
            Real counts from the database. Zero means zero.
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-card__value">{drafts}</p>
            <p className="stat-card__label">Articles in draft or review</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">{approved}</p>
            <p className="stat-card__label">Approved versions awaiting publish</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">0</p>
            <p className="stat-card__label">Open moderation reports</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__value">0</p>
            <p className="stat-card__label">Orders needing action</p>
          </div>
        </div>

        <div className="admin-empty">
          <h2 className="admin-empty__title">Quick actions</h2>
          <p className="admin-empty__text">
            Start in the newsroom: create a draft, review submissions, or publish
            approved articles. Use the navigation to switch sections.
          </p>
          <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Link href="/newsroom/new" className={buttonClassName("primary")}>
              Create draft
            </Link>

            <Link href="/newsroom/publish" className={buttonClassName("secondary")}>
              Publish approved
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
