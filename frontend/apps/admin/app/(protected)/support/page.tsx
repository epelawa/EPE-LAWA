import { PageFrame, PageIntro, Panel, Notice, StatusBadge } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { categoryLabel, statusLabel, SUPPORT_STATUSES } from "../../../../main/lib/support/rules";

export const dynamic = "force-dynamic"; export const fetchCache = "force-no-store";

type Row = { id: string; reference: string; requester_name: string; requester_email: string; category: string; priority: string; status: string; subject: string; needs_human: boolean; ai_summary: string | null; last_message_at: string; created_at: string; message_count: number; last_author: string | null };

const FILTERS = [
  { key: "attention", label: "Needs a reply" },
  { key: "active", label: "All active" },
  ...SUPPORT_STATUSES.map((entry) => ({ key: entry.key, label: statusLabel(entry.key, "staff") })),
] as const;
const PRIORITY_TONE: Record<string, "neutral" | "warning" | "danger"> = { low: "neutral", normal: "neutral", high: "warning", urgent: "danger" };
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });
const AUTHOR: Record<string, string> = { customer: "Requester", staff: "Staff", ai: "AI assistant", system: "System" };

export default async function SupportTickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.some((entry) => entry.key === status) ? status! : "attention";
  const db = await createStaffClient();
  const { data, error } = await db.rpc("staff_support_list", { p_status: filter });
  const rows = (data ?? []) as Row[];
  return <PageFrame className="ui-stack">
    <PageIntro title="Support tickets" description="Requests from the public Support page. The AI assistant sorts every ticket and answers simple ones; anything it hands over is marked “Needs staff”." />
    <nav aria-label="Ticket filters" className="ui-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
      {FILTERS.map((entry) => <a key={entry.key} href={`${adminHref("/support")}?status=${entry.key}`} className={entry.key === filter ? "btn-primary" : "btn-secondary"} aria-current={entry.key === filter ? "page" : undefined}>{entry.label}</a>)}
    </nav>
    {error ? <Panel role="alert">Support tickets are unavailable or your access could not be verified.</Panel> : <Panel className="ui-stack">
      <h2>{FILTERS.find((entry) => entry.key === filter)?.label} · {rows.length}</h2>
      {rows.length === 0 ? <p>No tickets here.</p> : rows.map((row) => <article key={row.id} className="ui-item ui-stack-sm">
        <h3 style={{ margin: 0 }}><a className="ui-text-link" href={adminHref(`/support/${row.id}`)}>{row.reference} · {row.subject}</a></h3>
        <div className="ui-row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
          <StatusBadge tone={row.status === "open" ? "warning" : row.status === "resolved" ? "success" : "neutral"}>{statusLabel(row.status, "staff")}</StatusBadge>
          <StatusBadge tone={PRIORITY_TONE[row.priority] ?? "neutral"}>{row.priority}</StatusBadge>
          <StatusBadge>{categoryLabel(row.category)}</StatusBadge>
          {row.needs_human ? <StatusBadge tone="danger">Needs staff</StatusBadge> : null}
        </div>
        <p style={{ margin: 0 }}><strong>{row.requester_name}</strong> · {row.requester_email}</p>
        {row.ai_summary ? <p style={{ margin: 0 }} className="ui-muted">AI summary: {row.ai_summary}</p> : null}
        <p style={{ margin: 0 }} className="ui-muted">{row.message_count} message{row.message_count === 1 ? "" : "s"} · last from {AUTHOR[row.last_author ?? ""] ?? "—"} · <time dateTime={row.last_message_at}>{when(row.last_message_at)}</time></p>
      </article>)}
    </Panel>}
    <Notice>Opening a ticket is recorded in the audit log. Replies are emailed from the site's mail account with the requester's private ticket link.</Notice>
  </PageFrame>;
}
