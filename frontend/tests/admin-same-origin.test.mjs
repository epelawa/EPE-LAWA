import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.env.NEXT_PUBLIC_ADMIN_BASE_PATH = "/admin";
const { ADMIN_BASE_PATH, adminHref, adminLoginHref, safeAdminNextPath, staffHref } = await import("../apps/admin/lib/admin-path.ts");

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const routes = [
  ["/admin", "frontend/apps/main/app/admin/(protected)/page.tsx"],
  ["/admin/newsroom", "frontend/apps/main/app/admin/(protected)/newsroom/page.tsx"],
  ["/admin/newsroom/new", "frontend/apps/main/app/admin/(protected)/newsroom/new/page.tsx"],
  ["/admin/newsroom/[id]", "frontend/apps/main/app/admin/(protected)/newsroom/[id]/page.tsx"],
  ["/admin/itan-ilu-mi/review", "frontend/apps/main/app/admin/(protected)/itan-ilu-mi/review/page.tsx"],
  ["/admin/moderation/forum", "frontend/apps/main/app/admin/(protected)/moderation/forum/page.tsx"],
  ["/admin/business-review", "frontend/apps/main/app/admin/(protected)/business-review/page.tsx"],
  ["/admin/business-review/moderation", "frontend/apps/main/app/admin/(protected)/business-review/moderation/page.tsx"],
  ["/admin/people", "frontend/apps/main/app/admin/(protected)/people/page.tsx"],
  ["/admin/radio", "frontend/apps/main/app/admin/(protected)/radio/page.tsx"],
  ["/admin/tourism", "frontend/apps/main/app/admin/(protected)/tourism/page.tsx"],
  ["/admin/login", "frontend/apps/main/app/admin/login/page.tsx"],
];

test("each staff section is mounted at the chosen same-origin /admin path", () => {
  assert.equal(ADMIN_BASE_PATH, "/admin");
  for (const [route, wrapper] of routes) {
    assert.ok(existsSync(resolve(root, wrapper)), `${route} wrapper exists`);
    const source = read(wrapper);
    if (route === "/admin/login") {
      assert.match(source, /<AccountShell\b/, "same-origin staff login uses the shared public auth shell");
      assert.match(source, /safeAdminNextPath\(nextValue\)/, "return hint is sanitized before it reaches the form");
      assert.match(source, /<AdminLoginForm nextPath=\{nextPath\}/);
      continue;
    }
    assert.match(source, /export \{ default \} from/, `${route} reuses its existing page`);
    const importPath = source.match(/from\s+["']([^"']+)["']/)?.[1];
    assert.ok(importPath, `${route} has an explicit source page`);
    assert.ok(existsSync(resolve(dirname(resolve(root, wrapper)), `${importPath}.tsx`)), `${route} source page resolves`);
  }

  const shell = read("frontend/apps/main/app/admin/layout.tsx");
  assert.match(shell, /basePath="\/admin"/);
  assert.match(shell, /index: false/);
  const proxy = read("frontend/apps/main/proxy.ts");
  // Commit 5beb813 moved the gate to every path and removed the /admin-only
  // matcher. The return hint is still pathname-derived and admin-only.
  assert.match(proxy, /const pathname = request\.nextUrl\.pathname;/);
  assert.match(proxy, /if \(pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)\)/);
  assert.match(proxy, /requestHeaders\.set\("x-epe-lawa-admin-route", pathname\)/);
  assert.doesNotMatch(proxy, /request\.nextUrl\.search/, "return hints exclude query parameters");
  const catchAll = read("frontend/apps/main/app/admin/[...unknown]/page.tsx");
  assert.match(catchAll, /notFound\(\)/);
  assert.match(read("frontend/apps/main/app/admin/not-found.tsx"), /admin\/app\/not-found/);
  const shellCss = read("frontend/apps/main/app/admin/admin-shell.css");
  assert.match(shellCss, /body:has\(\.admin-shell\) \.site-head/);
  assert.match(shellCss, /body:has\(\.admin-shell\) \.site-footer/);
  assert.match(shellCss, /\.brand-lockup__text\s*\{/);
  assert.match(shellCss, /\.ep-button--primary\s*\{/);
  assert.doesNotMatch(shellCss, /theme-toggle|appearance/i);
  assert.match(read("frontend/apps/main/app/robots.ts"), /disallow: \["\/admin"\]/);
  assert.equal(adminHref("/newsroom"), "/admin/newsroom");
  assert.equal(staffHref("/newsroom", "/admin"), "/admin/newsroom");
  assert.equal(staffHref("/admin/newsroom", "/admin"), "/admin/newsroom");
  assert.equal(staffHref("//outside.example", "/admin"), "/");
});

test("every protected same-origin staff route uses the existing server-side gate", () => {
  const layout = read("frontend/apps/main/app/admin/(protected)/layout.tsx");
  const guard = read("frontend/apps/admin/components/admin-access-guard.tsx");
  assert.match(layout, /AdminAccessGuard loginPath="\/admin\/login"/);
  assert.match(guard, /await headers\(\)/);
  assert.match(guard, /adminLoginHref\(loginPath, requestHeaders\.get\("x-epe-lawa-admin-route"\)\)/);
  assert.match(guard, /getAdminAccessForSession/);
  assert.match(guard, /if \(!access\.allowed \|\| !access\.userId\)/);
  assert.match(guard, /redirect\(adminLoginHref/);
  assert.match(guard, /httpOnly: true/);
  assert.match(guard, /secure: true/);
  assert.match(guard, /sameSite: "lax"/);
  assert.match(guard, /path: "\/"/);
  assert.match(guard, /domain: undefined/);
  assert.doesNotMatch(guard, /searchParams|safeAdminNextPath|formData\.get\("next"\)/);

  const loginAction = read("frontend/apps/admin/lib/login-actions.ts");
  assert.ok(loginAction.indexOf("signInAdminWithPassword") < loginAction.indexOf("redirect(safeAdminNextPath"));
  assert.match(loginAction, /safeAdminNextPath\(formData\.get\("next"\)\)/);
});

test("staff login return hints are relative, same-origin, and cannot select login or grant access", () => {
  assert.equal(safeAdminNextPath("/admin/newsroom?state=draft"), "/admin/newsroom?state=draft");
  assert.equal(safeAdminNextPath("/admin"), "/admin");
  assert.equal(adminLoginHref("/admin/login", "/admin/newsroom"), "/admin/login?next=%2Fadmin%2Fnewsroom");
  assert.equal(adminLoginHref("/admin/login", "https://outside.example/admin"), "/admin/login?next=%2Fadmin");
  assert.equal(adminLoginHref("/login", "/newsroom", ""), "/login", "standalone staff app ignores the main-app route header");
  for (const value of [
    "https://outside.example/admin",
    "//outside.example/admin",
    "/newsroom",
    "/admin/login",
    "/admin/login?next=/admin/unknown-area",
    "/admin/../login",
    "\\\\outside.example\\admin",
    "\u0000/admin/unknown-area",
    12,
  ]) {
    assert.equal(safeAdminNextPath(value), "/admin", `reject unsafe return hint ${String(value)}`);
  }

  const editorialActions = read("frontend/apps/admin/lib/actions.ts");
  assert.match(editorialActions, /revalidatePath\("\/news"\)/, "public article cache paths remain public");
  assert.match(editorialActions, /revalidatePath\("\/"\)/, "public homepage cache remains public");
  assert.match(read("frontend/apps/admin/lib/tourism-actions.ts"), /revalidatePath\("\/tourism"\)/, "public tourism route remains public");
});
