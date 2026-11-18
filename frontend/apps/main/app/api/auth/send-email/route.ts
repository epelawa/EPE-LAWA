import { deliverAuthMessage, renderAuthMessages, verifyAuthMail } from "../../../../lib/auth-mail-hook";
export const runtime = "nodejs";
const MAX_BYTES = 64 * 1024;
function error(status: number, message: string) { return Response.json({ error: { http_code: status, message } }, { status }); }

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.AUTH_EMAIL_HOOK_SECRET, apiKey = process.env.RESEND_API_KEY, from = process.env.AUTH_EMAIL_FROM;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !apiKey || !from || !projectUrl || !origin) return error(503, "Email delivery is not configured");
  if (!request.body) return error(400, "Invalid request");
  const reader = request.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); return error(413, "Request too large"); } chunks.push(part.value); }
  } catch { return error(400, "Invalid request"); } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString("utf8");
  let payload: unknown;
  try { payload = verifyAuthMail(body, Object.fromEntries(request.headers), secret); } catch { return error(401, "Invalid signature"); }
  let messages;
  try { messages = renderAuthMessages(payload, projectUrl, origin); } catch { return error(400, "Invalid email request"); }
  try { for (const message of messages) await deliverAuthMessage(message, { apiKey, from }); }
  catch { return error(503, "Email delivery unavailable"); }
  return Response.json({});
}
