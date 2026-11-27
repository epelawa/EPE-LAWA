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
    { id: "00000000-0000-4000-8000-000000000101", slug: "smoke-breaking-story", title: "Smoke fixture: breaking headline", summary: "Synthetic browser-test content only.", published_at: new Date(now - 5 * 60_000).toISOString(), is_breaking: true, breaking_until: new Date(now + 60 * 60_000).toISOString(), author_name: "Browser fixture", category_slug: "local-news", category_label: "Local News" },
    { id: "00000000-0000-4000-8000-000000000102", slug: "smoke-market-story", title: "Smoke fixture: market story", summary: "Synthetic searchable story for local browser tests.", published_at: new Date(now - 15 * 60_000).toISOString(), is_breaking: false, breaking_until: null, author_name: "Browser fixture", category_slug: "local-news", category_label: "Local News" },
    { id: "00000000-0000-4000-8000-000000000103", slug: "smoke-sports-story", title: "Smoke fixture: sports story", summary: "Synthetic category-filter story for local browser tests.", published_at: new Date(now - 25 * 60_000).toISOString(), is_breaking: false, breaking_until: null, author_name: null, category_slug: "sports", category_label: null },
  ];
}

function filteredStories(url) {
  let stories = fixtureStories();
  if (mode === "news-many" || mode === "news-many-breaking") stories = Array.from({ length: 35 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 201).padStart(12, "0")}`, slug: `test-story-${index + 1}`, title: `Test story ${index + 1}`,
    summary: "Synthetic browser-test content only.", published_at: new Date(Date.now() - index * 60000).toISOString(), is_breaking: mode === "news-many-breaking" && index >= 33, breaking_until: mode === "news-many-breaking" && index >= 33 ? new Date(Date.now() + (index === 33 ? 3600000 : -3600000)).toISOString() : null,
    author_name: "Browser fixture", category_slug: index % 2 ? "sports" : "local-news", category_label: index % 2 ? "Sports" : "Local News",
    cover_url: index === 0 ? "https://images.example.com/test-cover.jpg" : null, cover_alt: index === 0 ? "Synthetic cover" : null, cover_credit: index === 0 ? "Test photographer" : null, cover_caption: null,
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
        if (value !== "empty" && value !== "error" && value !== "stories" && value !== "ranking" && value !== "news-many" && value !== "news-many-breaking" && value !== "history" && value !== "slow-stories" && value !== "radio" && value !== "directory") {
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

  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/search_published_news") {
    if (mode === "error") { respond(response,503,{code:"SMOKE503",message:"Search unavailable"}); return; }
    let body=""; request.on("data",chunk=>{body+=chunk.toString()});
    request.on("end",()=>{try {const input=JSON.parse(body);const needle=String(input.p_query ?? "").toLowerCase();let rows = ["stories","ranking","news-many","news-many-breaking"].includes(mode) ? filteredStories(new URL("http://localhost")) : []; rows=rows.filter(row=>(!input.p_category || row.category_slug===input.p_category) && [row.title,row.summary,row.author_name,row.category_label].some(value=>String(value ?? "").toLowerCase().includes(needle)));respond(response,200,rows.slice(input.p_offset ?? 0,(input.p_offset ?? 0)+31));} catch {respond(response,400,{error:"Invalid request"});}});return;
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
    const missingPublicDetail = [
      ["/rest/v1/tourism_destinations", "eq.no-such-destination"],
      ["/rest/v1/forum_categories", "eq.no-such-category"],
      ["/rest/v1/forum_threads", "eq.no-such-thread"],
    ].some(([path, slug]) => url.pathname === path && url.searchParams.get("slug") === slug);
    if (missingPublicDetail) {
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }
    if (mode === "slow-stories" && url.pathname === "/rest/v1/published_articles") {
      const items = filteredStories(url);
      setTimeout(() => respond(response, 200, items, { "content-range": `0-${Math.max(0, items.length - 1)}/${items.length}` }), 5000);
      return;
    }
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

    // Turn 5 directory redesign. Empty (honest empty state) by default; "directory" mode serves synthetic,
    // obviously fictional listings so cards, badges, filters, pagination and the profile can be exercised.
    if (["/rest/v1/published_businesses", "/rest/v1/business_categories", "/rest/v1/business_featured", "/rest/v1/business_photos", "/rest/v1/businesses"].includes(url.pathname)) {
      const categories = [{ slug: "services", label: "Services" }, { slug: "food-drink", label: "Food & Drink" }, { slug: "trades", label: "Trades" }, { slug: "health", label: "Health" }];
      const listings = mode !== "directory" ? [] : Array.from({ length: 15 }, (_, i) => ({
        id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, "0")}`, slug: `fixture-business-${i + 1}`,
        name: i === 2 ? "Fixture Business With An Exceptionally Long Name For Wrapping Checks Limited" : `Fixture Business ${i + 1}`,
        category_slug: categories[i % 4].slug, category_label: categories[i % 4].label,
        description: i % 3 === 0 ? null : "Synthetic browser-test listing. Not a real business; used only to check layout and behaviour.",
        area: i % 2 ? "Fixture Area" : null, address: i % 2 ? null : "1 Fixture Road", landmark: null,
        phone: i === 0 ? "+2348000000000" : null, whatsapp: i === 0 ? "08000000000" : null, email: i === 0 ? "fixture@example.invalid" : null,
        website: i === 0 ? "https://example.invalid" : null, hours: null, is_verified: i % 4 === 0, logo_key: null,
        published_at: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
      }));
      if (url.pathname === "/rest/v1/business_categories") { respond(response, 200, mode === "directory" ? categories : [], { "content-range": "*/0" }); return; }
      if (url.pathname === "/rest/v1/business_featured") { const only = url.searchParams.get("business_id")?.replace(/^eq\./, ""); const live = mode === "directory" ? [{ business_id: listings[0].id, ends_at: "2099-01-01T00:00:00Z" }].filter((row) => !only || row.business_id === only) : []; respond(response, 200, live, { "content-range": "*/0" }); return; }
      if (url.pathname !== "/rest/v1/published_businesses") { respond(response, 200, [], { "content-range": "*/0" }); return; }
      let rows = listings;
      const eq = (key) => url.searchParams.get(key)?.replace(/^eq\./, "");
      if (eq("slug")) rows = rows.filter((row) => row.slug === eq("slug"));
      if (eq("category_slug")) rows = rows.filter((row) => row.category_slug === eq("category_slug"));
      if (url.searchParams.get("is_verified") === "eq.true") rows = rows.filter((row) => row.is_verified);
      const neq = url.searchParams.get("id")?.match(/^neq\.(.+)$/)?.[1];
      if (neq) rows = rows.filter((row) => row.id !== neq);
      const inIds = url.searchParams.get("id")?.match(/^in\.\((.*)\)$/)?.[1];
      if (inIds) rows = rows.filter((row) => inIds.split(",").map((v) => v.replace(/"/g, "")).includes(row.id));
      for (const or of url.searchParams.getAll("or")) {
        // Reads the first quoted ilike value the way PostgREST does: undo the quoting,
        // drop the surrounding %…% (or legacy *…*) and the LIKE escapes (lib/postgrest-search.ts).
        const quoted = or.match(/ilike\."((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
        const needle = quoted.replace(/\\(.)/g, "$1").replace(/^[%*]|[%*]$/g, "").replace(/\\([\\%_*])/g, "$1").toLowerCase();
        rows = rows.filter((row) => [row.name, row.description, row.category_label, row.area, row.address].some((v) => String(v ?? "").toLowerCase().includes(needle)));
      }
      if ((url.searchParams.get("order") ?? "").startsWith("published_at")) rows = [...rows].sort((a, b) => b.published_at.localeCompare(a.published_at));
      else if ((url.searchParams.get("order") ?? "").startsWith("is_verified")) rows = [...rows].sort((a, b) => Number(b.is_verified) - Number(a.is_verified) || a.name.localeCompare(b.name));
      else rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
      const total = rows.length;
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 1000);
      const page = rows.slice(offset, offset + limit);
      respond(response, 200, page, { "content-range": total ? `${offset}-${offset + page.length - 1}/${total}` : "*/0" });
      return;
    }

    // Turn 5 radio page: empty by default (the honest "schedule is being updated" state). The
    // "radio" mode serves synthetic, clearly labelled fixture slots so the day selector and the
    // on-air marker can be exercised; it never reflects production programming.
    if (url.pathname === "/rest/v1/radio_schedule" || url.pathname === "/rest/v1/programmes") {
      if (mode === "radio" && url.pathname === "/rest/v1/radio_schedule") {
        const lagosDay = new Date(Date.now() + 3600000).getUTCDay();
        const rows = [];
        for (let day = 0; day < 7; day++) {
          rows.push({ id: `fixture-am-${day}`, day_of_week: day, starts_at: "07:00:00", ends_at: "08:00:00", note: "Synthetic browser-test slot", programmes: { name: "Fixture morning slot" } });
          if (day === lagosDay) rows.push({ id: `fixture-now-${day}`, day_of_week: day, starts_at: "00:00:00", ends_at: "23:59:00", note: null, programmes: { name: "Fixture all-day slot" } });
        }
        respond(response, 200, rows, { "content-range": `0-${rows.length - 1}/${rows.length}` });
        return;
      }
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

    // Turn 5: other public, read-only collections answer with an honest empty list (instead of 405) so
    // their empty states and filter forms can be checked.
    if (["/rest/v1/published_people", "/rest/v1/people_offices", "/rest/v1/history_records", "/rest/v1/history_record_sources"].includes(url.pathname)) {
      respond(response, 200, [], { "content-range": "*/0" });
      return;
    }
  }

  respond(response, 405, { error: "Fixture permits only health, mode control, and read-only smoke queries" });
});

server.listen(port, "localhost", () => {
  console.log(`Local browser-smoke fixture listening on http://localhost:${port}`);
});
