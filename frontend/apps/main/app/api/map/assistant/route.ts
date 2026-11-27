import { formAdminClient, formRateAllowance, formRateMessage } from "../../../../lib/form-server";
import { answerMapQuestion, type AssistantTurn } from "../../../../lib/ai/map-assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Map assistant (owner brief, turn 26): Epe Division places and directions only.
 * No account needed; each network gets 20 questions an hour (and the site 100)
 * so visitors cannot drain the free AI allowance the newsroom depends on.
 */

const MAX_BYTES = 8 * 1024;
const NO_STORE = { "cache-control": "no-store" };
const PER_NETWORK_PER_HOUR = 20;

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: NO_STORE });
}

function parseTurns(value: unknown): AssistantTurn[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 12) return null;
  const turns: AssistantTurn[] = [];
  for (const item of value) {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const role = record?.role === "user" || record?.role === "assistant" ? record.role : null;
    const text = typeof record?.text === "string" ? record.text.replace(/\s+/g, " ").trim().slice(0, 500) : "";
    if (!role || !text) return null;
    turns.push({ role, text });
  }
  return turns.at(-1)?.role === "user" ? turns : null;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply(403, { error: "Requests must come from this site." });
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BYTES) return reply(400, { error: "Ask a shorter question." });
  let turns: AssistantTurn[] | null = null;
  try { turns = parseTurns((JSON.parse(raw) as { turns?: unknown })?.turns); } catch { turns = null; }
  if (!turns) return reply(400, { error: "Ask a question about a place or route in Epe Division." });
  if (!(await formRateAllowance("map_assistant", PER_NETWORK_PER_HOUR))) return reply(429, { error: await formRateMessage() });
  let db;
  try { db = formAdminClient(); } catch { return reply(503, { error: "The assistant is unavailable right now." }); }
  const result = await answerMapQuestion(db, turns);
  if (!result.ok) return reply(503, { error: result.error });
  return reply(200, { reply: result.reply });
}
