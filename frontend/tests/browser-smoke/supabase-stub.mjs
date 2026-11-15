import { createServer } from "node:http";

const port = Number(process.argv[2] ?? "54321");
let mode = "empty";

const fixtureUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "browser-smoke@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  user_metadata: { display_name: "Aderonke Smoke" },
  app_metadata: { provider: "email", providers: ["email"] },
};
const fixtureProfile = {
  user_id: fixtureUser.id,
  handle: "aderonke_smoke",
  display_name: "Aderonke Smoke",
  deleted_at: null,
};
const fixtureAccessToken = "browser-smoke-access-token";

function respond(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(payload === undefined ? "" : JSON.stringify(payload));
}

function isFixtureSession(request) {
  return request.headers.authorization === `Bearer ${fixtureAccessToken}`;
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
        if (value !== "empty" && value !== "error") {
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

  if (url.pathname.startsWith("/auth/v1/")) {
    if (request.method === "GET" && url.pathname === "/auth/v1/user" && isFixtureSession(request)) {
      respond(response, 200, fixtureUser);
      return;
    }
    if (request.method === "POST" && url.pathname === "/auth/v1/logout" && isFixtureSession(request)) {
      respond(response, 204);
      return;
    }
    respond(response, 401, { error: "Invalid local browser-smoke session" });
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

    if (url.pathname === "/rest/v1/profiles" && isFixtureSession(request)) {
      respond(response, 200, [fixtureProfile], { "content-range": "0-0/1" });
      return;
    }

    if (
      url.pathname === "/rest/v1/published_articles" ||
      url.pathname === "/rest/v1/categories"
    ) {
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }
  }

  respond(response, 405, { error: "Fixture permits only health, mode control, and read-only smoke queries" });
});

server.listen(port, "localhost", () => {
  console.log(`Local browser-smoke fixture listening on http://localhost:${port}`);
});
