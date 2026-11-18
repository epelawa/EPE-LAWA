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

function fixtureStories() {
  const now = Date.now();
  return [
    { id: "00000000-0000-4000-8000-000000000101", slug: "smoke-breaking-story", title: "Smoke fixture: breaking headline", summary: "Synthetic browser-test content only.", published_at: new Date(now - 5 * 60_000).toISOString(), is_breaking: true, breaking_until: new Date(now + 60 * 60_000).toISOString(), author_name: "Browser fixture", category_slug: "local-news", category_label: "Local News", og_image_key: null },
    { id: "00000000-0000-4000-8000-000000000102", slug: "smoke-market-story", title: "Smoke fixture: market story", summary: "Synthetic searchable story for local browser tests.", published_at: new Date(now - 15 * 60_000).toISOString(), is_breaking: false, breaking_until: null, author_name: "Browser fixture", category_slug: "local-news", category_label: "Local News", og_image_key: null },
    { id: "00000000-0000-4000-8000-000000000103", slug: "smoke-sports-story", title: "Smoke fixture: sports story", summary: "Synthetic category-filter story for local browser tests.", published_at: new Date(now - 25 * 60_000).toISOString(), is_breaking: false, breaking_until: null, author_name: null, category_slug: "sports", category_label: null, og_image_key: "unapproved/synthetic-cover.jpg" },
  ];
}

function filteredStories(url) {
  let stories = fixtureStories();
  if (mode === "news-many" || mode === "news-many-breaking") stories = Array.from({ length: 35 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 201).padStart(12, "0")}`, slug: `test-story-${index + 1}`, title: `Test story ${index + 1}`,
    summary: "Synthetic browser-test content only.", published_at: new Date(Date.now() - index * 60000).toISOString(), is_breaking: mode === "news-many-breaking" && index >= 33, breaking_until: mode === "news-many-breaking" && index >= 33 ? new Date(Date.now() + (index === 33 ? 3600000 : -3600000)).toISOString() : null,
    author_name: "Browser fixture", category_slug: index % 2 ? "sports" : "local-news", category_label: index % 2 ? "Sports" : "Local News",
    og_image_key: null, cover_url: index === 0 ? "https://images.example.com/test-cover.jpg" : null, cover_alt: index === 0 ? "Synthetic cover" : null, cover_credit: index === 0 ? "Test photographer" : null, cover_caption: null,
  }));
  const slug = url.searchParams.get("slug");
  if (slug?.startsWith("eq.")) stories = stories.filter((story) => story.slug === slug.slice(3));
  if (slug?.startsWith("neq.")) stories = stories.filter((story) => story.slug !== slug.slice(4));
  const breaking = url.searchParams.get("is_breaking");
  if (breaking === "eq.true") stories = stories.filter((story) => story.is_breaking);
  const until = url.searchParams.get("breaking_until");
  if (until?.startsWith("gt.")) stories = stories.filter((story) => story.breaking_until && story.breaking_until > until.slice(3));
  const category = url.searchParams.get("category_slug");
  if (category?.startsWith("eq.")) stories = stories.filter((story) => story.category_slug === category.slice(3));
  const title = url.searchParams.get("title");
  if (title?.startsWith("ilike.")) {
    const needle = title.slice(6).replace(/^%|%$/g, "").replace(/\\([\\%_])/g, "$1").toLocaleLowerCase();
    stories = stories.filter((story) => story.title.toLocaleLowerCase().includes(needle));
  }
  const range = requestRange(url);
  return stories.slice(range.start, range.end + 1);
}

function requestRange(url) {
  const range = url.searchParams.get("offset");
  const limit = Number(url.searchParams.get("limit")) || 1000;
  const start = Number(range) || 0;
  return { start, end: start + limit - 1 };
}

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
        if (value !== "empty" && value !== "error" && value !== "stories" && value !== "ranking" && value !== "news-many" && value !== "news-many-breaking" && value !== "history") {
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

  if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && request.method === "POST" && url.pathname === "/rest/v1/rpc/has_capability") {
    respond(response, 200, false);
    return;
  }
  if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && request.method === "HEAD" && ["/rest/v1/comments", "/rest/v1/saved_articles"].includes(url.pathname)) {
    respond(response, 200, undefined, { "content-range": "*/0" });
    return;
  }
  if (request.method === "GET" && url.pathname.startsWith("/rest/v1/")) {
    if (mode === "error" && (url.pathname === "/rest/v1/published_articles" || url.pathname === "/rest/v1/categories")) {
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

    if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/articles") {
      respond(response, 200, [{ published_version_id: "fixture-version" }]);
      return;
    }
    if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/article_versions") {
      respond(response, 200, [{ body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Synthetic article for browser testing." }] }, { type: "paragraph", content: [{ type: "text", text: "Second published paragraph." }] }, { type: "paragraph", content: [{ type: "text", text: "Final published paragraph." }] }] } }]);
      return;
    }
    if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/comments") {
      respond(response, 200, []);
      return;
    }
    if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/published_article_engagement") {
      const items = mode === "ranking" ? fixtureStories().map((story, index) => ({ article_id: story.id, view_count: [50, 3, 17][index], comment_count: 0, read_minutes: 1 })) : [];
      respond(response, 200, items);
      return;
    }
    if (mode === "history" && url.pathname === "/rest/v1/history_records") {
      const rows = Array.from({ length: 12 }, (_, index) => ({ id: `history-${index + 1}`, title: `Synthetic history ${index + 1}`, account: "Browser fixture only.", published_at: "2026-01-01T00:00:00Z", community: "Test community", category: "community-history", family_name: null, lineage_description: null }));
      const range = requestRange(url);
      respond(response, 200, rows.slice(range.start, range.end + 1));
      return;
    }
    if (mode === "history" && url.pathname === "/rest/v1/history_record_sources") {
      respond(response, 200, []);
      return;
    }

    // Private member data is available only to the isolated fixture session.
    if ((url.pathname === "/rest/v1/saved_articles" || url.pathname === "/rest/v1/notifications") && isFixtureSession(request)) {
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }

    if (
      url.pathname === "/rest/v1/published_articles" ||
      url.pathname === "/rest/v1/categories"
    ) {
      if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/published_articles") {
        const items = filteredStories(url);
        respond(response, 200, items, { "content-range": `0-${Math.max(0, items.length - 1)}/${items.length}` });
        return;
      }
      if ((mode === "stories" || mode === "ranking" || mode === "news-many" || mode === "news-many-breaking") && url.pathname === "/rest/v1/categories") {
        respond(response, 200, [{ slug: "local-news", label: "Local News" }, { slug: "sports", label: "Sports" }], { "content-range": "0-1/2" });
        return;
      }
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }
  }

  respond(response, 405, { error: "Fixture permits only health, mode control, and read-only smoke queries" });
});

server.listen(port, "localhost", () => {
  console.log(`Local browser-smoke fixture listening on http://localhost:${port}`);
});
