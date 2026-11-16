import { createServer } from "node:http";

const port = Number(process.argv[2] ?? "54321");
let mode = "empty";

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
