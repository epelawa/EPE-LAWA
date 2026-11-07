import Link from "next/link";
import { createClient } from "../../lib/supabase";

type MetricState = { value: number | null; note: string | null };

async function hasCapability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  capability: string,
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("has_capability", { p_capability: capability });
  if (error) {
    console.error("admin capability check failed", { capability, code: error.code });
    return null;
  }
  return data === true;
}

function metric(value: number | null, note: string | null = null): MetricState { return { value, note }; }
function displayMetric(item: MetricState): string {
  return item.value === null ? "Unavailable" : new Intl.NumberFormat("en-NG").format(item.value);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [canPublishArticles, canModerate, canManageOrders] = await Promise.all([
    hasCapability(supabase, "article.publish"),
    hasCapability(supabase, "moderation.review"),
    hasCapability(supabase, "order.manage"),
  ]);

  const [unpublishedArticles, privateVersions, reportsResult, ordersResult] = await Promise.all([
    canPublishArticles
      ? supabase.from("articles").select("id", { count: "exact", head: true })
          .is("published_version_id", null).not("current_version_id", "is", null)
      : Promise.resolve({ count: null, error: null }),
    canPublishArticles
      ? supabase.from("article_versions").select("id", { count: "exact", head: true })
          .in("state", ["draft", "review", "approved"])
      : Promise.resolve({ count: null, error: null }),
    canModerate
      ? supabase.from("forum_reports").select("id", { count: "exact", head: true }).eq("state", "open")
      : Promise.resolve({ count: null, error: null }),
    canManageOrders
      ? supabase.from("orders").select("id", { count: "exact", head: true })
          .in("status", ["pending", "paid", "preparing", "out_for_delivery"])
      : Promise.resolve({ count: null, error: null }),
  ]);

  function readMetric(
    result: { count: number | null; error: { code?: string } | null },
    hasAccess: boolean | null,
    capability: string,
  ): MetricState {
    if (hasAccess === false) return metric(null, "This account does not have the required capability.");
    if (hasAccess === null || result.error) {
      if (result.error) console.error("admin dashboard metric read failed", { capability, code: result.error.code });
      return metric(null, "The count could not be verified.");
    }
    return metric(result.count ?? 0);
  }

  const metrics = [
    {
      label: "Articles without a public version",
      detail: "Articles with a current version but no public version yet.",
      item: readMetric(unpublishedArticles, canPublishArticles, "article.publish"),
      href: "/newsroom",
    },
    {
      label: "Private versions ready to publish",
      detail: "Draft, review or approved versions. No second reviewer is required for publication.",
      item: readMetric(privateVersions, canPublishArticles, "article.publish"),
      href: "/newsroom",
    },
    {
      label: "Open moderation reports",
      detail: "Reports awaiting a moderator decision.",
      item: readMetric(reportsResult, canModerate, "moderation.review"),
      href: "/moderation/forum",
    },
    {
      label: "Orders needing attention",
      detail: "Pending, paid or in-progress orders.",
      item: readMetric(ordersResult, canManageOrders, "order.manage"),
      href: "/orders",
    },
  ];

  return (
    <div className="site-main">
      <div className="ep-container">
        <header className="page-header">
          <p className="page-header__eyebrow">EPE LAWA workspace</p>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__lede">Live counts appear only when this account can verify them. “Unavailable” is not a zero.</p>
        </header>

        <section aria-label="Workspace metrics" className="stat-grid">
          {metrics.map(({ label, detail, item, href }) => (
            <article key={label} className="stat-card">
              <p className="stat-card__value">{displayMetric(item)}</p>
              <h2 className="stat-card__label">{label}</h2>
              <p className="stat-card__detail">{item.note || detail}</p>
              {item.value !== null ? <Link href={href} className="stat-card__link">Open workspace</Link> : null}
            </article>
          ))}
        </section>

        <section aria-labelledby="quick-actions-heading" className="admin-empty">
          <h2 id="quick-actions-heading" className="admin-empty__title">Newsroom actions</h2>
          <p className="admin-empty__text">
            Create and save a private draft, then publish the current version directly when ready. The database checks verified staff access, article.publish permission and the current revision, and records each publication in the audit log.
          </p>
          <div className="admin-action-row">
            <Link href="/newsroom/new" className="admin-action admin-action--primary">Create draft</Link>
            <Link href="/newsroom" className="admin-action">Open newsroom</Link>
          </div>
        </section>

        <p className="admin-dashboard-note">
          Counts are requested from the database on each private dashboard view. Personal member details,
          delivery addresses, payment data and private reports are not shown here.
        </p>
      </div>
    </div>
  );
}
