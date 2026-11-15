import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { adminHref } from "../../lib/admin-path";
import { PageFrame, PageIntro, Panel, StatusBadge } from "@epelawa/ui";

type MetricState = { value: number | null; note: string | null };

async function hasCapability(supabase: Awaited<ReturnType<typeof createClient>>, capability: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("has_capability", { p_capability: capability });
  if (error) {
    console.error("admin capability check failed", { capability, code: error.code });
    return null;
  }
  return data === true;
}

function metric(value: number | null, note: string | null = null): MetricState {
  return { value, note };
}

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
      ? supabase.from("articles").select("id", { count: "exact", head: true }).is("published_version_id", null).not("current_version_id", "is", null)
      : Promise.resolve({ count: null, error: null }),
    canPublishArticles
      ? supabase.from("article_versions").select("id", { count: "exact", head: true }).in("state", ["draft", "review", "approved"])
      : Promise.resolve({ count: null, error: null }),
    canModerate
      ? supabase.from("forum_reports").select("id", { count: "exact", head: true }).eq("state", "open")
      : Promise.resolve({ count: null, error: null }),
    canManageOrders
      ? supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "paid", "preparing", "out_for_delivery"])
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
      detail: "Articles with a current version that has not been published.",
      item: readMetric(unpublishedArticles, canPublishArticles, "article.publish"),
      href: "/newsroom",
    },
    {
      label: "Private article versions",
      detail: "Draft, review or approved versions that are not currently public.",
      item: readMetric(privateVersions, canPublishArticles, "article.publish"),
      href: "/newsroom",
    },
    {
      label: "Open moderation reports",
      detail: "Reports currently awaiting a moderator decision.",
      item: readMetric(reportsResult, canModerate, "moderation.review"),
      href: "/moderation/forum",
    },
    {
      label: "Orders needing attention",
      detail: "Orders in pending, paid or in-progress states.",
      item: readMetric(ordersResult, canManageOrders, "order.manage"),
      href: "/orders",
    },
  ];

  return (
    <PageFrame>
      <div className="admin-dashboard">
        <section className="admin-dashboard__hero" aria-label="Dashboard overview">
          <PageIntro
            eyebrow="Staff workspace"
            title="Dashboard"
            description="A focused view of verified work across editorial, moderation and orders."
          />
        </section>

        <section className="admin-dashboard__section" aria-labelledby="dashboard-queues-heading">
          <div className="admin-dashboard__section-head">
            <div>
              <p className="admin-dashboard__eyebrow">Current work</p>
              <h2 id="dashboard-queues-heading">Live queues</h2>
            </div>
            <p>Counts are shown only when this account can verify them.</p>
          </div>

          <div className="admin-dashboard__grid">
            {metrics.map(({ label, detail, item, href }) => (
              <Panel key={label} className="admin-dashboard__metric">
                <div className="admin-dashboard__metric-top">
                  <span>Current queue</span>
                  <StatusBadge tone={item.value === null ? "warning" : "neutral"}>
                    {item.value === null ? "Unavailable" : "Verified count"}
                  </StatusBadge>
                </div>
                <p className="admin-dashboard__value">{displayMetric(item)}</p>
                <h3>{label}</h3>
                <p className="admin-dashboard__detail">{item.note || detail}</p>
                {item.value !== null ? (
                  <Link href={adminHref(href)} className="admin-dashboard__link">
                    Open workspace <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </Panel>
            ))}
          </div>
        </section>

        <section className="admin-dashboard__editorial" aria-labelledby="dashboard-editorial-heading">
          <div>
            <p className="admin-dashboard__eyebrow">Editorial</p>
            <h2 id="dashboard-editorial-heading">Newsroom actions</h2>
            <p>Create and save a private draft, then publish the current version when it is ready. Each publication is capability-checked and recorded in the audit log.</p>
          </div>
          <div className="admin-dashboard__actions">
            <Link href={adminHref("/newsroom/new")} className="btn-primary">Create draft</Link>
            <Link href={adminHref("/newsroom")} className="btn-secondary">Open newsroom</Link>
          </div>
        </section>

        <p className="admin-dashboard__note">Counts are requested from the database on each private dashboard view. Personal member details, delivery addresses, payment data and private reports are not shown here. Unavailable means the count could not be verified; it is never a zero.</p>
      </div>
    </PageFrame>
  );
}
