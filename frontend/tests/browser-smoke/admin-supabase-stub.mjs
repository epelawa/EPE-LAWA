import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";

const dataPort = Number(process.argv[2] ?? "5443");
const controlPort = Number(process.argv[3] ?? "5444");
const keyPath = process.argv[4];
const certPath = process.argv[5];
if (!keyPath || !certPath) throw new Error("Temporary HTTPS certificate paths are required.");

const userId = "11111111-1111-4111-8111-111111111111";
const accessToken = "local-admin-dashboard-smoke-token";
const capabilities = new Set([
  "article.create", "article.review", "article.publish", "moderation.review",
  "history.review", "tourism.review", "business.review", "order.manage",
  "radio.manage", "people.manage", "audit.read",
]);
let mode = "authorized-error";
let requestLog = [];
const commentId = "22222222-2222-4222-8222-222222222222";
const articleId = "33333333-3333-4333-8333-333333333333";

function respond(response, status, payload, headers = {}, head = false) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store, max-age=0",
    "pragma": "no-cache",
    ...headers,
  });
  response.end(head ? undefined : JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 8_192) {
        request.destroy();
        reject(new Error("Request body exceeded the local fixture limit."));
      }
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON.")); }
    });
    request.on("error", reject);
  });
}

const controlServer = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/__admin-smoke__/health") {
    respond(response, 200, { status: "ok" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/__admin-smoke__/requests") {
    respond(response, 200, requestLog);
    return;
  }
  if (request.method === "POST" && url.pathname === "/__admin-smoke__/mode") {
    readJson(request).then((body) => {
      const nextMode = body.mode;
      if (!["authorized-error", "denied", "capability-error", "workspace"].includes(nextMode)) {
        respond(response, 400, { error: "Unsupported local test mode." });
        return;
      }
      mode = nextMode;
      requestLog = [];
      respond(response, 200, { mode });
    }).catch(() => respond(response, 400, { error: "Invalid local test request." }));
    return;
  }
  respond(response, 405, { error: "The local control fixture permits only health and mode selection." });
});

const dataServer = createHttpsServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, async (request, response) => {
  const url = new URL(request.url ?? "/", "https://127.0.0.1");
  requestLog.push(`${request.method} ${url.pathname}`);
  const isRpc = url.pathname.startsWith("/rest/v1/rpc/");
  const allowedMethod = request.method === "GET" || request.method === "HEAD" || (request.method === "POST" && isRpc);
  if (!allowedMethod) {
    respond(response, 405, { code: "LOCAL_FIXTURE_READ_ONLY", message: "Writes are disabled in this isolated dashboard fixture." });
    return;
  }

  if (request.headers.authorization !== `Bearer ${accessToken}`) {
    respond(response, 401, { code: "LOCAL_FIXTURE_UNAUTHENTICATED", message: "Synthetic test session required." });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    respond(response, 200, { id: userId, email: "staff@example.test", email_confirmed_at: "2026-01-01T00:00:00.000Z" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/rest/v1/staff_profiles") {
    respond(response, 200, [{ user_id: userId, is_active: true }]);
    return;
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/has_capability") {
    let body;
    try { body = await readJson(request); }
    catch { respond(response, 400, { error: "Invalid capability request." }); return; }
    const capability = body.p_capability;
    if (mode === "capability-error" && capability !== "admin.access") {
      respond(response, 503, { code: "LOCAL_CAPABILITY_UNAVAILABLE", message: "The isolated fixture is simulating an unavailable permission check." });
      return;
    }
    const allowed = capability === "admin.access" || (mode !== "denied" && capabilities.has(capability));
    respond(response, 200, allowed);
    return;
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/staff_roles_authorized") {
    respond(response, 200, mode !== "denied");
    return;
  }
  if (mode === "workspace" && request.method === "GET" && url.pathname === "/rest/v1/articles" && url.searchParams.get("id") === `eq.${articleId}`) {
    const versionId = "44444444-4444-4444-8444-444444444444";
    respond(response, 200, [{
      id: articleId, revision: 1, slug: "synthetic-story", current_version_id: versionId, published_version_id: null,
      current_version: { id: versionId, title: "Synthetic story", state: "draft", version_number: 1,
        author_id: userId, category_id: articleId, created_by: userId, body: { type: "doc", content: [] } },
    }]);
    return;
  }
  if ((request.method === "GET" || request.method === "HEAD") && [
    "/rest/v1/articles", "/rest/v1/article_versions", "/rest/v1/forum_reports",
  ].includes(url.pathname)) {
    if (mode === "authorized-error" || mode === "capability-error") {
      respond(response, 503, { code: "LOCAL_DASHBOARD_READ_UNAVAILABLE", message: "No local dataset is configured; the dashboard must not infer zero." }, { "content-range": "*/*" }, request.method === "HEAD");
      return;
    }
    respond(response, 200, [], { "content-range": "*/0" }, request.method === "HEAD");
    return;
  }

  if (mode === "workspace" && request.method === "HEAD" && url.pathname.startsWith("/rest/v1/")) {
    respond(response, 200, null, { "content-range": "*/0" }, true);
    return;
  }
  if (mode === "workspace" && request.method === "GET") {
    const fixtures = {
      categories: [{ id: articleId, label: "Fixture category" }],
      authors: [{ id: userId, display_name: "Fixture author" }],
      comments: [{ id: commentId, state: "visible", body: "Synthetic comment", created_at: "2026-01-01T00:00:00.000Z", article: { slug: "sample" } }],
    };
    if (url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.slice("/rest/v1/".length);
      respond(response, 200, fixtures[table] ?? []);
      return;
    }
  }
  if (mode === "workspace" && request.method === "POST" && url.pathname === "/rest/v1/rpc/comment_staff_update") {
    const body = await readJson(request);
    if (body.p_comment_id === commentId && body.p_body === "Updated synthetic comment") {
      await new Promise((resolve) => setTimeout(resolve, 850));
      respond(response, 200, null);
    } else {
      respond(response, 400, { error: "Unexpected synthetic comment payload" });
    }
    return;
  }
  if (mode === "workspace" && request.method === "POST" && url.pathname === "/rest/v1/rpc/article_create_with_hashtags") {
    const body = await readJson(request);
    if (body.p_title === "Synthetic story" && body.p_tags?.length === 1 && body.p_tags[0] === "EpeNews") {
      await new Promise((resolve) => setTimeout(resolve, 850));
      respond(response, 200, articleId);
    } else {
      respond(response, 400, { code: "22023", message: "Unexpected synthetic article payload" });
    }
    return;
  }
  if (isRpc && request.method === "POST") {
    respond(response, 405, { code: "LOCAL_FIXTURE_READ_ONLY", message: "This RPC is not in the fixture's read allowlist." });
    return;
  }
  respond(response, 405, { code: "LOCAL_FIXTURE_UNSUPPORTED", message: "Endpoint is not supported by the isolated dashboard fixture." });
});

controlServer.listen(controlPort, "127.0.0.1", () => console.log(`Admin smoke control fixture ready on 127.0.0.1:${controlPort}`));
dataServer.listen(dataPort, "127.0.0.1", () => console.log(`Read-only HTTPS staff fixture ready on 127.0.0.1:${dataPort}`));
