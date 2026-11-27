import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageIntro, Panel, StatusBadge, Notice } from "../../../../components/design-system";
import SupportTicketReply from "../../../../components/support-ticket-reply";
import { formAdminClient } from "../../../../lib/form-server";
import { ticketForLink } from "../../../../lib/support/tickets";
import { categoryLabel, statusLabel, SUPPORT_STATUSES } from "../../../../lib/support/rules";
import { resolveSupportTicket } from "../../actions";
import "../../support.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your support ticket", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };

const AUTHOR: Record<string, string> = { customer: "You", staff: "EPE LAWA team", ai: "AI assistant", system: "Update" };
const when = (iso: string) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso));

export default async function TicketPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { reference } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : null;
  const ref = decodeURIComponent(reference).toUpperCase();
  let ticket = null;
  let messages: { id: number; author_kind: string; body: string; created_at: string }[] = [];
  try {
    const db = formAdminClient();
    ticket = await ticketForLink(db, ref, token);
    if (ticket) {
      const { data } = await db.from("support_ticket_messages").select("id,author_kind,body,created_at").eq("ticket_id", ticket.id).eq("internal", false).order("created_at", { ascending: true }).limit(200);
      messages = (data ?? []) as typeof messages;
    }
  } catch { ticket = null; }

  if (!ticket) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Support" title="We can't open this ticket" description="The link is incomplete or no longer valid." />
      <Panel className="ui-stack"><p>Use the full link from your ticket email, or ask for a fresh link on the <Link href="/support">Support page</Link>.</p></Panel>
    </PageFrame>;
  }
  const tone = SUPPORT_STATUSES.find((entry) => entry.key === ticket.status)?.tone ?? "neutral";
  const finished = ticket.status === "resolved" || ticket.status === "closed";
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow={`Ticket ${ticket.reference}`} title={ticket.subject} description={`${categoryLabel(ticket.category)} · opened ${when(ticket.created_at)}`} />
    <div className="support-ticket-head"><StatusBadge tone={tone}>{statusLabel(ticket.status)}</StatusBadge>{ticket.needs_human && !finished ? <span>A member of our team is looking at this.</span> : null}</div>
    <Notice>Keep this page's link private — anyone with it can read and reply to this ticket.</Notice>
    <Panel className="ui-stack">
      <h2 className="support-subhead">Conversation</h2>
      <ol className="support-thread">
        {messages.map((message) => <li key={message.id} className="support-thread__msg" data-author={message.author_kind}>
          <div className="support-thread__meta"><span className="support-thread__who">{AUTHOR[message.author_kind] ?? "Update"}</span><time dateTime={message.created_at}>{when(message.created_at)}</time>{message.author_kind === "ai" ? <span>· automated reply</span> : null}</div>
          <p className="support-thread__body">{message.body}</p>
        </li>)}
      </ol>
    </Panel>
    {ticket.status === "closed" ? <Panel><p>This ticket is closed. If you still need help, <Link href="/support">open a new ticket</Link> and mention {ticket.reference}.</p></Panel> : <Panel className="ui-stack">
      <h2 className="support-subhead">{finished ? "Still need help? Reply to reopen" : "Add a reply"}</h2>
      <SupportTicketReply reference={ticket.reference} token={token ?? ""} />
      {!finished ? <form action={resolveSupportTicket}><input type="hidden" name="reference" value={ticket.reference} /><input type="hidden" name="token" value={token ?? ""} /><button type="submit" className="btn-secondary">My problem is solved — close it</button></form> : null}
    </Panel>}
  </PageFrame>;
}
