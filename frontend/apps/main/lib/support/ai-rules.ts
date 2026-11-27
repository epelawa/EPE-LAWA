import { isCategory, isPriority, type SupportCategory, type SupportPriority } from "./rules";

/** What the AI support assistant decided for one ticket. Pure, so it can be tested. */
export type SupportDecision = {
  action: "reply" | "escalate";
  category: SupportCategory;
  priority: SupportPriority;
  summary: string;
  reason: string;
  reply: string;
};

export const MAX_AI_REPLIES_PER_TICKET = 3;

export function validateSupportDecision(value: unknown): SupportDecision | null {
  const row = value as Record<string, unknown>;
  if (!row || typeof row !== "object" || (row.action !== "reply" && row.action !== "escalate")) return null;
  const reason = typeof row.reason === "string" ? row.reason.trim().slice(0, 800) : "";
  const summary = typeof row.summary === "string" ? row.summary.trim().replace(/\s+/g, " ").slice(0, 600) : "";
  if (!reason || summary.length < 5) return null;
  const reply = typeof row.reply === "string" ? row.reply.trim() : "";
  if (row.action === "reply" && (reply.length < 40 || reply.length > 2500)) return null;
  return {
    action: row.action,
    category: isCategory(row.category) ? row.category : "general",
    priority: isPriority(row.priority) ? row.priority : "normal",
    summary,
    reason,
    reply,
  };
}

/** Safety rules applied after the model: some tickets always need a person. */
export function mustEscalate(decision: SupportDecision, context: { aiReplies: number; text: string }): string | null {
  if (decision.action === "escalate") return decision.reason;
  if (context.aiReplies >= MAX_AI_REPLIES_PER_TICKET) return `The assistant has already replied ${context.aiReplies} times; a person should take over.`;
  if (decision.category === "privacy") return "Privacy and personal-data requests are always handled by staff.";
  if (decision.priority === "urgent") return "Urgent tickets are always handled by staff.";
  if (/\b(refund|chargeback|lawyer|legal action|court|sue|police|threat|delete my (account|data)|data protection|ndpr|ndpa)\b/i.test(context.text)) return "The ticket mentions money, legal, safety or data-deletion matters, which staff must handle.";
  return null;
}
