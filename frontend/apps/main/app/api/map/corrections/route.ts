import { formAdminClient, formRateAllowance, formRateMessage } from "../../../../lib/form-server";
import { humanCheckFailedMessage, verifyHumanCheck } from "../../../../lib/human-check";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BYTES = 8 * 1024;
const NO_STORE = { "cache-control": "no-store" };
const RATE_LIMIT = 5;

type Correction = {
  place_name: string;
  details: string;
  directions_query: string | null;
  source_note: string | null;
  source_url: string | null;
};

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: NO_STORE });
}

function clean(value: unknown, max: number, required = false): string | null | undefined {
  if (typeof value !== "string") return required ? undefined : null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (required && text.length < 2) return undefined;
  return text || null;
}

function parseCorrection(value: unknown): Correction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const place_name = clean(record.place_name, 160, true);
  const details = clean(record.details, 2000, true);
  const directions_query = clean(record.directions_query, 240);
  const source_note = clean(record.source_note, 1000);
  const sourceRaw = clean(record.source_url, 500);
  if (place_name === undefined || details === undefined || !place_name || !details || details.length < 10 || directions_query === undefined || source_note === undefined || sourceRaw === undefined) return null;
  let source_url: string | null = null;
  if (sourceRaw) {
    try {
      const source = new URL(sourceRaw);
      if (source.protocol !== "https:" || !source.hostname || source.username || source.password) return null;
      source_url = source.toString();
    } catch {
      return null;
    }
  }
  return { place_name, details, directions_query, source_note, source_url };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply(403, { error: "Requests must come from this site." });
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) return reply(413, { error: "Your correction is too large." });
  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return reply(400, { error: "Please send a shorter correction." });
  let payload: Record<string, unknown> | null = null;
  let correction: Correction | null = null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
      correction = parseCorrection(parsed);
    }
  } catch { payload = null; correction = null; }
  if (typeof payload?.website === "string" && payload.website.trim()) return reply(201, { message: "Thank you. Your correction is private and will be checked by a human before it can inform the assistant." });
  if (!correction) return reply(400, { error: "Check the place name, correction, and HTTPS source URL, then try again." });
  const humanForm = new FormData();
  for (const [key, field] of [["hc-token", payload?.hc_token], ["hc-solution", payload?.hc_solution], ["cf-turnstile-response", payload?.turnstile_token]] as const) {
    if (typeof field === "string") humanForm.set(key, field);
  }
  if ((await verifyHumanCheck(humanForm)) === "fail") return reply(400, { error: humanCheckFailedMessage });
  if (!(await formRateAllowance("map_correction", RATE_LIMIT))) return reply(429, { error: await formRateMessage() });
  let db;
  try { db = formAdminClient(); } catch { return reply(503, { error: "The correction form is unavailable. Nothing was saved." }); }
  const { error } = await db.from("map_correction_submissions").insert({ ...correction, status: "pending" });
  if (error) {
    console.error("map correction submission failed", { code: error.code });
    return reply(503, { error: "The correction form is unavailable. Nothing was saved." });
  }
  return reply(201, { message: "Thank you. Your correction is private and will be checked by a human before it can inform the assistant." });
}
