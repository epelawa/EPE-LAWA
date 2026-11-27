/**
 * Friendly, personal openings for emails the AI assistant (and staff) send:
 * "Hello 👋 Tolu", "Yello Tolu 👋", "Good evening, Tolu 🌙"… chosen from the
 * person's name and the message id, so a retry never changes the greeting.
 */

/** The first name, tidied; "there" when the name is missing or looks like an address. */
export function firstName(raw: string | null | undefined): string {
  const value = (raw ?? "").replace(/[\u0000-\u001f\u007f<>"]/g, " ").trim();
  if (!value || value.includes("@") || /\d{3,}/.test(value)) return "there";
  const first = value.split(/\s+/)[0].replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, "");
  if (first.length < 2 || first.length > 40) return "there";
  return first === first.toLowerCase() || first === first.toUpperCase() ? first[0].toUpperCase() + first.slice(1).toLowerCase() : first;
}

function lagosHour(now: number): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date(now)));
}

export function timeOfDayGreeting(now: number): { text: string; emoji: string } {
  const hour = lagosHour(now);
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return { text: "Good evening", emoji: "🌙" };
}

const STYLES: ((name: string, now: number) => string)[] = [
  (name) => `Hello 👋 ${name},`,
  (name) => `Hi ${name} 👋`,
  (name) => `Hey ${name}!`,
  (name) => `Yello ${name} 👋`,
  (name, now) => { const part = timeOfDayGreeting(now); return `${part.text}, ${name} ${part.emoji}`; },
  (name) => `Ẹ n lẹ, ${name} 👋`,
  (name) => `Dear ${name},`,
  (name) => `Hello ${name}, thanks for reaching out 🙌`,
];

function hash(value: string): number {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function personalGreeting(name: string | null | undefined, seed: string, now = Date.now()): string {
  const first = firstName(name);
  const style = STYLES[hash(`${seed}:${first}`) % STYLES.length];
  return style(first, now);
}

/** Drops a greeting line the model wrote itself, so the email never opens twice. */
export function stripModelGreeting(body: string): string {
  return body.replace(/^\s*(?:hi|hello|hey|dear|yello|good (?:morning|afternoon|evening)|greetings|ẹ n lẹ)\b[^\n]{0,80}\n+/i, "").trimStart();
}

export function withGreeting(name: string | null | undefined, seed: string, body: string, now = Date.now()): string {
  return `${personalGreeting(name, seed, now)}\n\n${stripModelGreeting(body)}`;
}
