import Link from "next/link";
import { PageFrame, PageIntro, StatusBadge } from "@epelawa/ui";
import { adminHref } from "../../lib/admin-path";
import { createClient } from "../../lib/supabase";
import { combineCapabilityStates, resolveDashboardMetric, type DashboardMetricState } from "../../lib/dashboard-data";
import styles from "../admin-dashboard.module.css";

type Capability = "article.create" | "article.review" | "article.publish" | "moderation.review" | "history.review" | "tourism.review" | "business.review" | "order.manage" | "radio.manage" | "people.manage";
type CountResult = { count: number | null; error: { code?: string } | null };

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return "unavailable";
}

async function hasCapability(client: Awaited<ReturnType<typeof createClient>>, capability: Capability): Promise<boolean | null> {
  try {
    const { data, error } = await client.rpc("has_capability", { p_capability: capability });
    if (error) {
      console.error("admin dashboard capability check failed", { capability, code: error.code });
      return null;
    }
    return data === true || data === false ? data : null;
  } catch (error) {
    console.error("admin dashboard capability check failed", { capability, code: errorCode(error) });
    return null;
  }
}

async function countForCapability(
  allowed: boolean | null,
  capability: string,
  query: () => PromiseLike<CountResult>,
): Promise<DashboardMetricState> {
  if (allowed !== true) return resolveDashboardMetric(null, allowed);
  try {
    const result = await query();
    if (result.error) console.error("admin dashboard count read failed", { capability, code: result.error.code });
    return resolveDashboardMetric(result, allowed);
  } catch (error) {
    console.error("admin dashboard count read failed", { capability, code: errorCode(error) });
    return resolveDashboardMetric(null, allowed);
  }
}

function MetricCard({ label, detail, state, href }: { label: string; detail: string; state: DashboardMetricState; href?: string }) {
  const statusLabel = state.status === "verified" ? "Verified count" : state.status === "restricted" ? "Access restricted" : "Unavailable";
  const statusTone = state.status === "unavailable" ? "warning" : "neutral";
  const accessibleHref = state.status === "verified" && href ? adminHref(href) : null;
  return <article className={styles.metricCard} aria-labelledby={`metric-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>
    <div className={styles.metricTop}>
      <span className={styles.metricEyebrow}>Live queue</span>
      <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
    </div>
    <p className={`${styles.metricValue} ${state.status !== "verified" ? styles.metricUnavailable : ""}`}>{state.value === null ? "Unavailable" : new Intl.NumberFormat("en-NG").format(state.value)}</p>
    <h3 className={styles.metricTitle} id={`metric-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{label}</h3>
    <p className={styles.metricDetail}>{state.status === "verified" ? detail : state.status === "restricted" ? "Your current role does not include the required read capability." : "The permission or count could not be confirmed. No zero has been inferred."}</p>
    {accessibleHref ? <Link className={styles.metricLink} href={accessibleHref}>Open related workspace <span aria-hidden="true">→</span></Link> : null}
  </article>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const capabilityNames: Capability[] = ["article.create", "article.review", "article.publish", "moderation.review", "history.review", "tourism.review", "business.review", "order.manage", "radio.manage", "people.manage"];
  const capabilityEntries = await Promise.all(capabilityNames.map(async (name) => [name, await hasCapability(supabase, name)] as const));
  const capabilities = Object.fromEntries(capabilityEntries) as Record<Capability, boolean | null>;
  const articleRead = combineCapabilityStates(capabilities["article.review"], capabilities["article.publish"]);
  const [unpublishedArticles, privateVersions, openReports, activeOrders] = await Promise.all([
    countForCapability(articleRead, "article.review/article.publish", () => supabase.from("articles").select("id", { count: "exact", head: true }).is("published_version_id", null).not("current_version_id", "is", null)),
    countForCapability(articleRead, "article.review/article.publish", () => supabase.from("article_versions").select("id", { count: "exact", head: true }).in("state", ["draft", "review", "approved"])),
    countForCapability(capabilities["moderation.review"], "moderation.review", () => supabase.from("forum_reports").select("id", { count: "exact", head: true }).eq("state", "open")),
    countForCapability(capabilities["order.manage"], "order.manage", () => supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "paid", "preparing", "out_for_delivery"])),
  ]);

  const metrics = [
    { label: "Articles without a public version", detail: "Articles with a current version but no public version yet.", state: unpublishedArticles, href: "/newsroom" },
    { label: "Private editorial versions", detail: "Draft, review, and approved version records; this count is not a publishability decision.", state: privateVersions, href: "/newsroom" },
    { label: "Open moderation reports", detail: "Reports currently marked open in the moderation queue.", state: openReports, href: "/moderation/forum" },
    { label: "Orders needing attention", detail: "Orders in pending, paid, preparing, or out-for-delivery states; order work remains scope-gated.", state: activeOrders, href: "/orders" },
  ];

  return <PageFrame className={styles.page}>
    <PageIntro
      eyebrow="Staff workspace"
      title="Admin dashboard"
      actions={capabilities["article.create"] === true ? <Link className="btn-primary" href={adminHref("/newsroom/new")}>Create private draft</Link> : null}
    />

    <section className={styles.overview} aria-label="Dashboard counts">
      <div className={styles.metricGrid}>
        {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>
    </section>

  </PageFrame>;
}
