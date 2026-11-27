/** Support ticket vocabulary and input rules, shared by the site, the admin desk and the AI. */

export const SUPPORT_CATEGORIES = [
  { key: "general", label: "General question" },
  { key: "account", label: "My account or sign-in" },
  { key: "technical", label: "Something is broken" },
  { key: "business", label: "Business directory listing" },
  { key: "advertising", label: "Advertising" },
  { key: "news", label: "A news story" },
  { key: "privacy", label: "Privacy or my data" },
  { key: "other", label: "Something else" },
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["key"];

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_STATUSES = [
  { key: "open", label: "Open", tone: "warning" },
  { key: "in_progress", label: "With our team", tone: "neutral" },
  { key: "awaiting_customer", label: "Waiting for you", tone: "success" },
  { key: "resolved", label: "Resolved", tone: "success" },
  { key: "closed", label: "Closed", tone: "neutral" },
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]["key"];

export function categoryLabel(key: string): string {
  return SUPPORT_CATEGORIES.find((entry) => entry.key === key)?.label ?? "General question";
}

export function statusLabel(key: string, audience: "public" | "staff" = "public"): string {
  if (audience === "staff") {
    if (key === "awaiting_customer") return "Waiting for requester";
    if (key === "in_progress") return "In progress";
  }
  return SUPPORT_STATUSES.find((entry) => entry.key === key)?.label ?? key;
}

export function isCategory(value: unknown): value is SupportCategory {
  return SUPPORT_CATEGORIES.some((entry) => entry.key === value);
}

export function isPriority(value: unknown): value is SupportPriority {
  return SUPPORT_PRIORITIES.includes(value as SupportPriority);
}

export type NewTicketInput = { name: string; email: string; category: SupportCategory; subject: string; message: string };

/** Validates the public form; returns a plain-English problem or the cleaned input. */
export function validateNewTicket(raw: Record<string, unknown>): { ok: true; value: NewTicketInput } | { ok: false; problem: string } {
  const text = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const name = text("name").replace(/\s+/g, " ");
  const email = text("email").toLowerCase();
  const subject = text("subject").replace(/\s+/g, " ");
  const message = text("message");
  const category = text("category");
  if (name.length < 2 || name.length > 100 || /[\u0000-\u001f\u007f<>]/.test(name)) return { ok: false, problem: "Enter your name (2 to 100 characters)." };
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return { ok: false, problem: "Enter a valid email address so we can reply." };
  if (!isCategory(category)) return { ok: false, problem: "Choose what your request is about." };
  if (subject.length < 3 || subject.length > 120 || /[\u0000-\u001f\u007f]/.test(subject)) return { ok: false, problem: "Give your request a short title (3 to 120 characters)." };
  if (message.length < 10 || message.length > 5000 || message.includes("\0")) return { ok: false, problem: "Describe the problem in 10 to 5,000 characters." };
  return { ok: true, value: { name, email, category, subject, message } };
}

export function validateTicketReply(raw: unknown): { ok: true; value: string } | { ok: false; problem: string } {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length < 2 || body.length > 5000 || body.includes("\0")) return { ok: false, problem: "Write a reply of 2 to 5,000 characters." };
  return { ok: true, value: body };
}
