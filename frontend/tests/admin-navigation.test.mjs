import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const admin = join(root, "frontend/apps/admin");
const app = join(admin, "app");
const navigationSource = readFileSync(join(admin, "lib/navigation.ts"), "utf8");
const headerSource = readFileSync(join(admin, "components/site-header.tsx"), "utf8");
const footerSource = readFileSync(join(admin, "components/site-footer.tsx"), "utf8");

function routePaths(directory = app) {
  const routes = new Set();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const route of routePaths(path)) routes.add(route);
      continue;
    }
    if (entry.name !== "page.tsx") continue;
    const segments = relative(app, path).split("/").slice(0, -1)
      .filter((segment) => !/^\([^/]+\)$/.test(segment));
    routes.add(`/${segments.join("/")}`.replace(/\/$/, "") || "/");
  }
  return routes;
}

const actualRoutes = routePaths();
const registeredHrefs = [...navigationSource.matchAll(/href:\s*["']([^"']+)["']/g)]
  .map((match) => match[1]);

function hasRoute(href) {
  if (!href.startsWith("/") || href.includes("[")) return false;
  return existsSync(join(app, href.slice(1), "page.tsx")) || actualRoutes.has(href);
}

test("admin navigation links resolve to existing app routes", () => {
  assert.ok(registeredHrefs.length > 0, "expected registered navigation links");
  const primaryLinks = [...navigationSource.matchAll(/primary:\s*true/g)];
  assert.ok(primaryLinks.length >= 3, "desktop navigation should expose primary destinations");
  for (const href of registeredHrefs) {
    assert.ok(hasRoute(href), `${href} is not an existing admin route`);
  }
  for (const href of ["/newsroom", "/itan-ilu-mi/review", "/moderation/forum", "/business-review", "/orders", "/tourism", "/radio", "/people"]) {
    assert.ok(actualRoutes.has(href), `expected staff route ${href}`);
    assert.ok(registeredHrefs.includes(href), `expected navigation to ${href}`);
  }
  assert.match(headerSource, /staffHref\(item\.href,\s*basePath\)/, "staff links should stay in the configured same-origin namespace");
  assert.match(footerSource, /<Link[\s\S]*?href=\{item\.href\}/, "footer navigation should use Next Link");
});

test("navigation has no stale opening-soon claims or dead search link", () => {
  assert.doesNotMatch(navigationSource + headerSource, /Opening soon|upcomingSections/i);
  assert.doesNotMatch(headerSource, /action=["']\/search["']/);
  assert.doesNotMatch(navigationSource + headerSource + footerSource, /href:\s*["']\/(businesses|shop\/orders|staff|audit|search)(?:["']|\/)/);
});
