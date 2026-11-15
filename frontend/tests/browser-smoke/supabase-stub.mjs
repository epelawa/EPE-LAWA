import { createServer } from "node:http";

const port = Number(process.argv[2] ?? "54321");
let mode = "empty";
const syntheticMemberId = "00000000-0000-4000-8000-000000000001";
const syntheticAccessToken = "browser-smoke-synthetic-access-token";
const syntheticUser = {
  id: syntheticMemberId,
  aud: "authenticated",
  role: "authenticated",
  email: "browser-smoke-member@example.test",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
};
const syntheticProfile = {
  user_id: syntheticMemberId,
  handle: "browser-smoke-member",
  display_name: "Browser Smoke Member",
  deleted_at: null,
};

function respond(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/__smoke__/health") {
    respond(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__smoke__/mode") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1_024) request.destroy();
    });
    request.on("end", () => {
      try {
        const value = JSON.parse(body).mode;
        if (value !== "empty" && value !== "error" && value !== "member") {
          respond(response, 400, { error: "Unsupported fixture mode" });
          return;
        }
        mode = value;
        respond(response, 200, { mode });
      } catch {
        respond(response, 400, { error: "Invalid fixture mode request" });
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    if (mode === "member" && request.headers.authorization === `Bearer ${syntheticAccessToken}`) {
      respond(response, 200, syntheticUser);
    } else {
      respond(response, 401, { message: "Synthetic smoke session required" });
    }
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/rest/v1/")) {
    if (mode === "error") {
      respond(response, 503, {
        code: "SMOKE503",
        message: "Deterministic local browser-smoke fixture error",
        details: "No external service was contacted.",
        hint: "",
      });
      return;
    }

    if (
      mode === "member"
      && url.pathname === "/rest/v1/profiles"
      && url.searchParams.get("user_id") === `eq.${syntheticMemberId}`
      && request.headers.authorization === `Bearer ${syntheticAccessToken}`
    ) {
      respond(response, 200, syntheticProfile, { "content-range": "0-0/1" });
      return;
    }

    if (
      url.pathname === "/rest/v1/published_articles"
      || url.pathname === "/rest/v1/categories"
      || url.pathname === "/rest/v1/tourism_destinations"
    ) {
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }
  }

  respond(response, 405, {
    error: "Fixture permits only health, mode control, synthetic read-only auth/profile/article/tourism queries, and no writes",
  });
});

server.listen(port, "localhost", () => {
  console.log(`Local browser-smoke fixture listening on http://localhost:${port}`);
});
