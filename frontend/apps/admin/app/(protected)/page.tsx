import Link from "next/link";
import { PageFrame, PageIntro, StatusBadge } from "@epelawa/ui";
import { adminHref } from "../../lib/admin-path";
import { createClient } from "../../lib/supabase";
import { combineCapabilityStates, resolveDashboardMetric, type DashboardMetricState } from "../../lib/dashboard-data";
import styles from "../admin-dashboard.module.css";

type Capability = "article.create" | "article.review" | "article.publish" | "moderation.review" | "business.review" | "order.manage" | "radio.manage" | "people.manage" | "backup.read";
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

type IconName = "news" | "shield" | "orders" | "history" | "radio" | "people" | "database" | "arrow";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></>,
    shield: <><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    radio: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4m8.4-8.4a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2m14.2-14.2a10 10 0 0 1 0 14.2" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-2-4.5" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function MetricCard({ label, detail, state, href, icon }: { label: string; detail: string; state: DashboardMetricState; href?: string; icon: IconName }) {
  const statusLabel = state.status === "verified" ? "Live count" : state.status === "restricted" ? "Restricted" : "Unavailable";
  const statusTone = state.status === "unavailable" ? "warning" : "neutral";
  const accessibleHref = state.status === "verified" && href ? adminHref(href) : null;
  const card = (
    <>
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}><Icon name={icon} /></span>
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      </div>
      <p className={`${styles.metricValue} ${state.status !== "verified" ? styles.metricUnavailable : ""}`}>{state.value === null ? "—" : new Intl.NumberFormat("en-NG").format(state.value)}</p>
      <h3 className={styles.metricTitle}>{label}</h3>
      <p className={styles.metricDetail}>{state.status === "verified" ? detail : state.status === "restricted" ? "Your role does not include the required read capability." : "This count could not be confirmed. No zero has been inferred."}</p>
      {accessibleHref ? <span className={styles.metricLink}>Open workspace <span aria-hidden="true"><Icon name="arrow" /></span></span> : null}
    </>
  );
  const className = `${styles.metricCard} ${accessibleHref ? styles.metricCardLinked : ""}`;
  const ariaLabel = `${label}: ${state.value === null ? statusLabel : `${state.value}, ${statusLabel}`}`;
  return accessibleHref
    ? <Link className={className} href={accessibleHref} aria-label={ariaLabel}>{card}</Link>
    : <article className={className} aria-label={ariaLabel}>{card}</article>;
}

type Workflow = { label: string; detail: string; category: string; href: string; icon: IconName; allowed: boolean };

export default async function DashboardPage() {
  const supabase = await createClient();
  const capabilityNames: Capability[] = ["article.create", "article.review", "article.publish", "moderation.review", "business.review", "order.manage", "radio.manage", "people.manage", "backup.read"];
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
    { label: "Awaiting publication", detail: "Articles with a current version but no public version yet.", state: unpublishedArticles, href: "/newsroom", icon: "news" as const },
    { label: "Private versions", detail: "Draft, review and approved version records — not a publishability decision.", state: privateVersions, href: "/newsroom", icon: "history" as const },
    { label: "Open reports", detail: "Reports currently open in the moderation queue.", state: openReports, href: "/moderation/forum", icon: "shield" as const },
    { label: "Orders in progress", detail: "Pending, paid, preparing or out-for-delivery orders.", state: activeOrders, href: "/orders", icon: "orders" as const },
  ];

  const workflows: Workflow[] = [
    { label: "Newsroom", detail: "Write, review and publish articles with revision safety.", category: "Editorial", href: "/newsroom", icon: "news", allowed: capabilities["article.create"] === true || articleRead === true },
    { label: "Forum moderation", detail: "Resolve reports from the digital village square.", category: "Community", href: "/moderation/forum", icon: "shield", allowed: capabilities["moderation.review"] === true },
    { label: "Business review", detail: "Verify submitted businesses and directory records.", category: "Community", href: "/business-review", icon: "people", allowed: capabilities["business.review"] === true },
    { label: "Radio studio", detail: "Manage programmes, rights, episodes and schedule.", category: "Broadcast", href: "/radio", icon: "radio", allowed: capabilities["radio.manage"] === true },
    { label: "Who is Who", detail: "Curate people records and verification.", category: "Directory", href: "/people", icon: "people", allowed: capabilities["people.manage"] === true },
    { label: "Backups", detail: "Snapshot and restore the database in private R2.", category: "System", href: "/backups", icon: "database", allowed: capabilities["backup.read"] === true },
  ];
  const visibleWorkflows = workflows.filter((workflow) => workflow.allowed);

  const verifiedCount = metrics.filter((metric) => metric.state.status === "verified").length;

  return <PageFrame className={styles.page}>
    <PageIntro
      eyebrow="Staff workspace"
      title="Admin dashboard"
      description="Live queues across the EPE LAWA newsroom and community. Counts appear only where your role grants the matching read capability."
      actions={capabilities["article.create"] === true ? <Link className="btn-primary" href={adminHref("/newsroom/new")}>Create private draft</Link> : null}
      meta={
        <span className={styles.metaBadge}>
          <span className={`${styles.statusDot} ${verifiedCount === metrics.length ? styles.statusHealthy : styles.statusPartial}`} aria-hidden="true" />
          {verifiedCount === metrics.length ? "All queues available" : `${verifiedCount} of ${metrics.length} queues available to your role`}
        </span>
      }
    />

    <section className={styles.overview} aria-label="Dashboard counts">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>At a glance</p>
          <h2>Live queues</h2>
          <p>Counts update from the database; restricted or failed reads are never shown as zero.</p>
        </div>
      </div>
      <div className={styles.metricGrid}>
        {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>
    </section>

    <section className={styles.workflows} aria-label="Workspace shortcuts">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>Your workspace</p>
          <h2>Quick access</h2>
          <p>Only the areas your current capabilities allow are shown.</p>
        </div>
      </div>
      {visibleWorkflows.length === 0 ? (
        <div className={styles.noWorkflows}>
          <strong>No workspaces available</strong>
          <span>Ask an administrator to grant the capabilities you need.</span>
        </div>
      ) : (
        <ul className={styles.workflowGrid}>
          {visibleWorkflows.map((workflow) => (
            <li key={workflow.href}>
              <Link className={styles.workflowCard} href={adminHref(workflow.href)}>
                <span className={styles.workflowIcon}><Icon name={workflow.icon} /></span>
                <span className={styles.workflowText}>
                  <span className={styles.workflowCategory}>{workflow.category}</span>
                  <strong>{workflow.label}</strong>
                  <span className={styles.workflowDetail}>{workflow.detail}</span>
                </span>
                <span className={styles.workflowArrow} aria-hidden="true"><Icon name="arrow" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>

    <aside className={styles.privacyNote}>
      <span className={styles.privacyIcon}><Icon name="shield" /></span>
      <p><strong>Privacy by design.</strong> All publishing and moderation actions are capability-gated and audited server-side. Member and seller data stays private. Database restore never runs in the browser.</p>
    </aside>
  </PageFrame>;
}
