import Link from "next/link";
import { PageFrame, PageIntro, SectionHeading, StatusBadge } from "@epelawa/ui";
import { adminHref } from "../../lib/admin-path";
import { createClient } from "../../lib/supabase";
import { combineCapabilityStates, resolveDashboardMetric, type DashboardMetricState } from "../../lib/dashboard-data";
import styles from "../admin-dashboard.module.css";

type Capability = "article.create" | "article.review" | "article.publish" | "moderation.review" | "history.review" | "tourism.review" | "business.review" | "order.manage" | "radio.manage" | "people.manage";
type CountResult = { count: number | null; error: { code?: string } | null };
type Workflow = { category: string; title: string; detail: string; href: string; icon: "write" | "news" | "forum" | "history" | "business" | "tourism" | "orders" | "radio" | "people" | "staff" };

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

async function canManageStaff(client: Awaited<ReturnType<typeof createClient>>): Promise<boolean | null> {
  try {
    const { data, error } = await client.rpc("staff_roles_authorized");
    if (error) {
      console.error("admin dashboard staff-management check failed", { code: error.code });
      return null;
    }
    return data === true || data === false ? data : null;
  } catch (error) {
    console.error("admin dashboard staff-management check failed", { code: errorCode(error) });
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

function Icon({ name }: { name: Workflow["icon"] }) {
  const paths: Record<Workflow["icon"], React.ReactNode> = {
    write: <><path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /><path d="M12 20h8" /></>,
    news: <><path d="M4 5h12v14H4z" /><path d="M16 8h4v11h-4M7 9h6M7 12h6M7 15h4" /></>,
    forum: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
    history: <><path d="M4 7h16M6 4v3m12-3v3M5 7v13h14V7" /><path d="M8 11h8M8 15h5" /></>,
    business: <><path d="M4 20V8l8-4 8 4v12z" /><path d="M9 20v-6h6v6M8 9h.01M12 9h.01M16 9h.01" /></>,
    tourism: <><path d="m3 18 6-12 4 8 3-5 5 9z" /><path d="M5 18h14" /></>,
    orders: <><path d="M5 6h14M5 12h14M5 18h9" /><path d="m3 6 .01 0M3 12 .01 0M3 18 .01 0" /></>,
    radio: <><path d="M4 8h16v12H4z" /><path d="m7 5 10-2M8 12l5 2-5 2zM16 12h1" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1zM16 5.5a3 3 0 0 1 0 5.8M17 15a4.5 4.5 0 0 1 3.5 4.4" /></>,
    staff: <><path d="M12 3 19 6v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
  const [capabilityEntries, staffManagement] = await Promise.all([
    Promise.all(capabilityNames.map(async (name) => [name, await hasCapability(supabase, name)] as const)),
    canManageStaff(supabase),
  ]);
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

  const canOpenNewsroom = combineCapabilityStates(capabilities["article.create"], capabilities["article.review"], capabilities["article.publish"]);
  const workflows: Workflow[] = [
    ...(capabilities["article.create"] === true ? [{ category: "Editorial", title: "Create a private draft", detail: "Start an unpublished article. Saving a draft does not publish it.", href: "/newsroom/new", icon: "write" as const }] : []),
    ...(canOpenNewsroom === true ? [{ category: "Editorial", title: "Open the newsroom", detail: "Review article records available to your current editorial permissions.", href: "/newsroom", icon: "news" as const }] : []),
    ...(capabilities["moderation.review"] === true ? [{ category: "Community", title: "Forum moderation", detail: "Review open member reports and take actions only through the protected workflow.", href: "/moderation/forum", icon: "forum" as const }] : []),
    ...(capabilities["history.review"] === true ? [{ category: "Community", title: "History review", detail: "Review private community-history contributions before publication.", href: "/itan-ilu-mi/review", icon: "history" as const }] : []),
    ...(capabilities["business.review"] === true ? [{ category: "Business", title: "Business review", detail: "Review listing verification and moderation records.", href: "/business-review", icon: "business" as const }] : []),
    ...(capabilities["tourism.review"] === true ? [{ category: "Operations", title: "Tourism submissions", detail: "Review submissions using the existing staff workflow.", href: "/tourism", icon: "tourism" as const }] : []),
    ...(capabilities["order.manage"] === true ? [{ category: "Scope-gated", title: "Order operations", detail: "This route is shown only when order.manage is verified; provider/payment readiness is separate.", href: "/orders", icon: "orders" as const }] : []),
    ...(capabilities["radio.manage"] === true ? [{ category: "Operations", title: "Radio programming", detail: "Manage only records and rights represented in the protected staff workflow.", href: "/radio", icon: "radio" as const }] : []),
    ...(capabilities["people.manage"] === true ? [{ category: "People", title: "Who is Who records", detail: "Manage approved public-profile records; private details remain protected.", href: "/people", icon: "people" as const }] : []),
    ...(staffManagement === true ? [{ category: "Staff access", title: "Staff roles and accounts", detail: "Role and account controls are available only to the verified staff-management authority.", href: "/roles", icon: "staff" as const }] : []),
  ];

  return <PageFrame className={styles.page}>
    <PageIntro
      eyebrow="Staff workspace"
      title="Admin dashboard"
      description="A private view of the queues and workflows confirmed for your current staff session."
      actions={capabilities["article.create"] === true ? <Link className="btn-primary" href={adminHref("/newsroom/new")}>Create private draft</Link> : null}
    />

    <section className={styles.overview} aria-labelledby="dashboard-overview-title">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>Request-scoped overview</p>
          <h2 id="dashboard-overview-title">Work queues</h2>
          <p>Counts come from the database on this private request. An unavailable value is never shown as zero.</p>
        </div>
        <span className={styles.privateLabel}><Icon name="staff" />Private workspace</span>
      </div>
      <div className={styles.metricGrid}>
        {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>
    </section>

    <section className={styles.workflows} aria-labelledby="dashboard-workflows-title">
      <SectionHeading
        eyebrow="Next steps"
        title={<span id="dashboard-workflows-title">Workflows available to your role</span>}
        description="Shortcuts appear only after a fresh server-side capability check. Opening a page or using an action checks authorization again."
      />
      {workflows.length ? <ul className={styles.workflowGrid}>
        {workflows.map((workflow) => <li key={workflow.href}>
          <Link className={styles.workflowCard} href={adminHref(workflow.href)}>
            <span className={styles.workflowIcon}><Icon name={workflow.icon} /></span>
            <span className={styles.workflowText}>
              <span className={styles.workflowCategory}>{workflow.category}</span>
              <strong>{workflow.title}</strong>
              <span className={styles.workflowDetail}>{workflow.detail}</span>
            </span>
            <span className={styles.workflowArrow} aria-hidden="true">→</span>
          </Link>
        </li>)}
      </ul> : <div className={styles.noWorkflows} role="status">
        <strong>No dashboard shortcuts were confirmed for this request.</strong>
        <span>This view does not grant access. Protected staff pages and actions continue to enforce their own permissions.</span>
      </div>}
    </section>

    <aside className={styles.privacyNote} aria-label="Dashboard data boundaries">
      <span className={styles.privacyIcon}><Icon name="staff" /></span>
      <p><strong>Counts only, no private records.</strong> The dashboard does not list member emails, report contents, contribution evidence, delivery details, or payment data. A shortcut is not an authorization grant.</p>
    </aside>
  </PageFrame>;
}
