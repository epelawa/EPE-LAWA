// Audit-only overlay (sandbox, not committed): synthetic forum rows in front of the repo smoke stub.
import http from "node:http";
const ME = "00000000-0000-4000-8000-000000000001", OTHER = "00000000-0000-4000-8000-000000000002";
const cat = { id: "cat-1", slug: "general", name: "General (fixture)", description: "Synthetic browser-audit category.", rules: "Be kind. Synthetic fixture rules." };
const thread = { id: "thr-1", category_id: "cat-1", slug: "audit-thread", title: "Synthetic audit thread", state: "open", created_at: "2026-11-20T09:00:00Z", post_count: 3, last_activity_at: "2026-11-25T10:00:00Z", is_pinned: false };
const posts = [
  { id: "10000000-0000-4000-8000-000000000001", author_id: OTHER, body: "Synthetic message one from another fixture member.", state: "visible", created_at: "2026-11-20T09:00:00Z" },
  { id: "10000000-0000-4000-8000-000000000002", author_id: ME, body: "Synthetic reply from the signed-in fixture member — this should render as an own bubble.", state: "visible", created_at: "2026-11-21T09:00:00Z" },
  { id: "10000000-0000-4000-8000-000000000003", author_id: OTHER, body: "Synthetic third message, with a longer body to check wrapping on narrow screens at 320 pixels wide.", state: "visible", created_at: "2026-11-25T10:00:00Z" },
];
const profiles = [
  { user_id: ME, handle: "aderonke_smoke", display_name: "Aderonke Smoke", is_verified: false, verified_at: null, deleted_at: null, avatar_key: null },
  { user_id: OTHER, handle: "fixture_two", display_name: "Fixture Member Two", is_verified: false, verified_at: null, deleted_at: null, avatar_key: null },
];
const eq = (url, col) => { const v = url.searchParams.get(col); return v && v.startsWith("eq.") ? v.slice(3) : null; };
function send(res, req, rows) {
  const obj = (req.headers.accept || "").includes("vnd.pgrst.object");
  res.writeHead(200, { "content-type": "application/json", "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  res.end(JSON.stringify(obj ? (rows[0] ?? null) : rows));
}
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x"); const p = url.pathname;
  if (req.method === "GET" && p === "/rest/v1/forum_categories") { const s = eq(url, "slug"), id = eq(url, "id"); return send(res, req, [cat].filter(c => (!s || c.slug === s) && (!id || c.id === id))); }
  if (req.method === "GET" && p === "/rest/v1/forum_threads") { const s = eq(url, "slug"); return send(res, req, [thread].filter(t => !s || t.slug === s)); }
  if (req.method === "GET" && p === "/rest/v1/forum_posts") return send(res, req, posts);
  if (req.method === "GET" && /^\/rest\/v1\/forum_poll/.test(p)) return send(res, req, []);
  if (req.method === "GET" && p === "/rest/v1/profiles" && url.searchParams.get("user_id")?.startsWith("in.")) return send(res, req, profiles);
  if (req.method === "POST" && p === "/rest/v1/rpc/forum_reaction_counts") return send(res, req, [{ post_id: "10000000-0000-4000-8000-000000000001", count: 2 }]);
  if (req.method === "POST" && p === "/rest/v1/rpc/forum_unread_threads") return send(res, req, []);
  const up = http.request({ host: "::1", port: 54321, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on("error", () => { res.writeHead(502); res.end(); }); req.pipe(up);
}).listen(54331, "::1");
