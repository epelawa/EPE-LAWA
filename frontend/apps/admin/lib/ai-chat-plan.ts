/**
 * The admin AI chat's action plans (owner brief, turn 26). Pure helpers, no I/O,
 * so the safety rules are easy to test:
 *
 * - The AI may act only on EPE LAWA's own Epe Division content: articles
 *   (by article ID) and support tickets (by EPE-XXXXXX number).
 * - Deletes, and any action touching more than 3 items, wait for the admin to
 *   press Confirm. Edits, replies and status changes run straight away.
 * - Article edits are always saved as drafts; the chat never publishes.
 */

export const CONFIRM_ABOVE_ITEMS = 3;
export const CONFIRM_EXPIRES_MINUTES = 30;
export const TICKET_STATUSES = ["open", "in_progress", "awaiting_customer", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** What the model proposes (before the server checks it against the database). */
export type ProposedAction =
  | { type: "unpublish_articles" | "delete_articles"; ids: string[]; all: boolean; state: "published" | "unpublished" | "any" }
  | { type: "edit_article"; id: string; title: string | null; summary: string | null; body: string | null }
  | { type: "reply_ticket"; ticket: string; body: string; status: TicketStatus | null }
  | { type: "set_ticket_status"; ticket: string; status: TicketStatus };

export type ProposedPlan = { reply: string; actions: ProposedAction[] };

/** A checked step, with every target resolved to a real row. */
export type PlanStep =
  | { type: "unpublish_articles" | "delete_articles"; articles: { id: string; title: string }[] }
  | { type: "edit_article"; article: { id: string; title: string }; title: string | null; summary: string | null; body: string | null }
  | { type: "reply_ticket"; ticket: { id: string; reference: string; subject: string }; body: string; status: TicketStatus | null }
  | { type: "set_ticket_status"; ticket: { id: string; reference: string; subject: string }; status: TicketStatus };

const SHORT_OR_FULL_ID = /^(?:[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const TICKET = /^EPE-[A-Z0-9]{6}$/;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function optional(value: unknown, max: number): string | null {
  const text = str(value, max);
  return text ? text : null;
}
function status(value: unknown): TicketStatus | null {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value) ? (value as TicketStatus) : null;
}

/** Validates the model's JSON. Unknown action types are dropped, never guessed at. */
export function parseProposedPlan(value: unknown): ProposedPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const reply = str(record.reply, 4000);
  if (!reply) return null;
  const actions: ProposedAction[] = [];
  for (const raw of Array.isArray(record.actions) ? record.actions.slice(0, 10) : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (item.type === "unpublish_articles" || item.type === "delete_articles") {
      const ids = (Array.isArray(item.ids) ? item.ids : []).map((id) => str(id, 36).toLowerCase().replace(/^#/, "")).filter((id) => SHORT_OR_FULL_ID.test(id)).slice(0, 500);
      const all = item.all === true;
      const state = item.state === "published" || item.state === "unpublished" ? item.state : "any";
      if (ids.length || all) actions.push({ type: item.type, ids, all, state });
    } else if (item.type === "edit_article") {
      const id = str(item.id, 36).toLowerCase().replace(/^#/, "");
      const edit = { title: optional(item.title, 200), summary: optional(item.summary, 1000), body: optional(item.body, 60_000) };
      if (SHORT_OR_FULL_ID.test(id) && (edit.title || edit.summary || edit.body)) actions.push({ type: "edit_article", id, ...edit });
    } else if (item.type === "reply_ticket") {
      const ticket = str(item.ticket, 10).toUpperCase();
      const body = str(item.body, 8000);
      if (TICKET.test(ticket) && body.length >= 2) actions.push({ type: "reply_ticket", ticket, body, status: status(item.status) });
    } else if (item.type === "set_ticket_status") {
      const ticket = str(item.ticket, 10).toUpperCase();
      const next = status(item.status);
      if (TICKET.test(ticket) && next) actions.push({ type: "set_ticket_status", ticket, status: next });
    }
  }
  return { reply, actions };
}

export function stepItemCount(step: PlanStep): number {
  return step.type === "unpublish_articles" || step.type === "delete_articles" ? step.articles.length : 1;
}

/** Owner rule: a Confirm button before any delete, and before anything touching more than 3 items. */
export function planNeedsConfirm(steps: PlanStep[]): boolean {
  const total = steps.reduce((sum, step) => sum + stepItemCount(step), 0);
  return steps.some((step) => step.type === "delete_articles" && step.articles.length > 0) || total > CONFIRM_ABOVE_ITEMS;
}

export function describeStep(step: PlanStep): string {
  const list = (articles: { id: string; title: string }[]) => {
    const shown = articles.slice(0, 5).map((article) => `${article.id.slice(0, 8).toUpperCase()} “${article.title}”`).join(", ");
    return articles.length > 5 ? `${shown} and ${articles.length - 5} more` : shown;
  };
  switch (step.type) {
    case "delete_articles": return `Delete ${step.articles.length} article${step.articles.length === 1 ? "" : "s"} permanently: ${list(step.articles)}`;
    case "unpublish_articles": return `Unpublish ${step.articles.length} article${step.articles.length === 1 ? "" : "s"}: ${list(step.articles)}`;
    case "edit_article": return `Edit ${step.article.id.slice(0, 8).toUpperCase()} “${step.article.title}” (${[step.title ? "headline" : "", step.summary ? "summary" : "", step.body ? "body" : ""].filter(Boolean).join(", ")}) — saved as a draft`;
    case "reply_ticket": return `Reply to ticket ${step.ticket.reference}${step.status ? ` and set it to ${step.status.replace(/_/g, " ")}` : ""}`;
    case "set_ticket_status": return `Set ticket ${step.ticket.reference} to ${step.status.replace(/_/g, " ")}`;
  }
}

/** Article body text → the editor's document format (blank line between paragraphs). */
export function bodyDocument(text: string): { type: "doc"; content: { type: "paragraph"; content: { type: "text"; text: string }[] }[] } {
  return {
    type: "doc",
    content: text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] })),
  };
}

/** Document → plain text for the model to read. */
export function documentText(body: unknown, max = 4000): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const value = node as { type?: unknown; text?: unknown; content?: unknown };
    if (typeof value.text === "string") parts.push(value.text);
    if (Array.isArray(value.content)) {
      value.content.forEach(walk);
      if (value.type === "paragraph" || value.type === "heading") parts.push("\n\n");
    }
  };
  walk(body);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}
