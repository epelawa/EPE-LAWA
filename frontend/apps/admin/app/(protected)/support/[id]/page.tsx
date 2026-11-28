import { PageFrame, PageIntro, Panel, Notice, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import { categoryLabel, statusLabel, SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "../../../../../main/lib/support/rules";
import { replyToTicket, updateTicket } from "../actions";

export const dynamic = "force-dynamic"; export const fetchCache = "force-no-store";

type Ticket = { id: string; reference: string; requester_name: string; requester_email: string; category: string; priority: string; status: string; subject: string; needs_human: boolean; ai_summary: string | null; assigned_to: string | null; created_at: string };
type Message = { id: number; author_kind: string; body: string; internal: boolean; created_at: string; author_email: string | null };

const RESULTS: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  sent: { tone: "success", text: "Reply saved and emailed to the requester." },
  "saved-not-emailed": { tone: "warning", text: "Reply saved, but the email could not be sent. The requester can still see it on their ticket page." },
  noted: { tone: "success", text: "Internal note saved. It is never shown to the requester." },
  updated: { tone: "success", text: "Ticket updated." },
  short: { tone: "danger", text: "Write a reply of 2 to 8,000 characters." },
  failed: { tone: "danger", text: "That didn't save. Refresh and try again." },
};
const AUTHOR: Record<string, string> = { customer: "Requester", staff: "Staff", ai: "AI assistant", system: "System" };
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });

export default async function SupportTicket({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  const { id } = await params;
  const { result } = await searchParams;
  const notice = result ? RESULTS[result] : null;
  let ticket: Ticket | null = null; let messages: Message[] = [];
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const db = await createStaffClient();
    const { data, error } = await db.rpc("staff_support_get", { p_id: id });
    if (!error && data) { const value = data as { ticket: Ticket; messages: Message[] }; ticket = value.ticket; messages = value.messages ?? []; }
  }
  if (!ticket) return <PageFrame className="ui-stack"><PageIntro title="Ticket not found" /><Panel><a className="ui-text-link" href={adminHref("/support")}>Back to support tickets</a></Panel></PageFrame>;
  const finished = ticket.status === "resolved" || ticket.status === "closed";
  return <PageFrame className="ui-stack">
    <PageIntro title={ticket.subject} description={<>Reference <strong>{ticket.reference}</strong> · From <strong>{ticket.requester_name}</strong> · {ticket.requester_email} · opened {when(ticket.created_at)}</>} actions={<a className="btn-secondary" href={adminHref("/support")}>All tickets</a>} />
    {notice ? <Notice tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"}>{notice.text}</Notice> : null}
    <div className="ui-row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
      <StatusBadge tone={ticket.status === "open" ? "warning" : finished ? "success" : "neutral"}>{statusLabel(ticket.status, "staff")}</StatusBadge>
      <StatusBadge tone={ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : "neutral"}>{ticket.priority}</StatusBadge>
      <StatusBadge>{categoryLabel(ticket.category)}</StatusBadge>
      {ticket.needs_human ? <StatusBadge tone="danger">Needs staff</StatusBadge> : null}
      {ticket.assigned_to ? <StatusBadge>Assigned</StatusBadge> : null}
    </div>
    {ticket.ai_summary ? <Notice>AI summary: {ticket.ai_summary}</Notice> : null}
    <Panel className="ui-stack">
      <h2>Conversation</h2>
      {messages.map((message) => <article key={message.id} className="ui-item ui-stack-sm" style={message.internal ? { borderStyle: "dashed", background: "var(--surface-muted, #f6f7fb)" } : undefined}>
        <p style={{ margin: 0 }} className="ui-muted"><strong>{AUTHOR[message.author_kind] ?? message.author_kind}{message.author_email ? ` (${message.author_email})` : ""}</strong>{message.internal ? " · internal note" : ""} · <time dateTime={message.created_at}>{when(message.created_at)}</time></p>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</p>
      </article>)}
    </Panel>
    <Panel className="ui-stack">
      <h2>Reply</h2>
      <form action={replyToTicket} className="ui-stack">
        <input type="hidden" name="id" value={ticket.id} />
        <div className="ui-field"><label htmlFor="support-body">Message</label><textarea id="support-body" name="body" rows={6} minLength={2} maxLength={8000} required placeholder="Write your reply. A friendly greeting with the requester's name is added to the email automatically." /></div>
        <label className="ui-row" style={{ gap: "0.5rem", alignItems: "center" }}><input type="checkbox" name="internal" /> Internal note only (not emailed, not shown to the requester)</label>
        <div className="ui-field"><label htmlFor="support-after">Status after replying</label><select id="support-after" name="status" defaultValue=""><option value="">Waiting for requester (default)</option>{SUPPORT_STATUSES.map((entry) => <option key={entry.key} value={entry.key}>{statusLabel(entry.key, "staff")}</option>)}</select></div>
        <SubmitButton pendingLabel="Sending reply…" useLegacyClasses>Send</SubmitButton>
      </form>
    </Panel>
    <Panel className="ui-stack">
      <h2>Ticket details</h2>
      <form action={updateTicket} className="ui-stack">
        <input type="hidden" name="id" value={ticket.id} />
        <div className="ui-field"><label htmlFor="support-status">Status</label><select id="support-status" name="status" defaultValue={ticket.status}>{SUPPORT_STATUSES.map((entry) => <option key={entry.key} value={entry.key}>{statusLabel(entry.key, "staff")}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="support-priority">Priority</label><select id="support-priority" name="priority" defaultValue={ticket.priority}>{SUPPORT_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="support-category">Category</label><select id="support-category" name="category" defaultValue={ticket.category}>{SUPPORT_CATEGORIES.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></div>
        <label className="ui-row" style={{ gap: "0.5rem", alignItems: "center" }}><input type="checkbox" name="assign_me" /> Assign this ticket to me</label>
        <SubmitButton pendingLabel="Saving…" variant="secondary" useLegacyClasses>Save details</SubmitButton>
      </form>
    </Panel>
  </PageFrame>;
}
