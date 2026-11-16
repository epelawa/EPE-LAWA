import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("native selects, pickers, checkboxes, details and dialogs are branded in both apps", async () => {
  const [mainControls, adminControls, mainLayout, adminLayout, mainGlobals, adminGlobals] = await Promise.all([
    read("frontend/apps/main/app/native-controls.css"),
    read("frontend/apps/admin/app/native-controls.css"),
    read("frontend/apps/main/app/layout.tsx"),
    read("frontend/apps/admin/app/layout.tsx"),
    read("frontend/apps/main/app/globals.css"),
    read("frontend/apps/main/app/admin/admin-shell.css"),
  ]);
  for (const css of [mainControls, adminControls]) {
    assert.match(css, /select:not\(\[multiple\]\)\s*\{[^}]*appearance:\s*none/);
    assert.match(css, /input\[type="checkbox"\]/);
    assert.match(css, /input\[type="radio"\]/);
    assert.match(css, /::-webkit-file-upload-button/);
    assert.match(css, /::-webkit-calendar-picker-indicator/);
    assert.match(css, /input\[type="range"\]/);
    assert.match(css, /details > summary::after/);
    assert.match(css, /\.ui-dialog::backdrop/);
    assert.match(css, /\.ui-dialog__surface/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  }
  assert.match(mainLayout, /import "\.\/native-controls\.css";/);
  assert.match(adminLayout, /import "\.\/native-controls\.css";/);
  assert.match(mainGlobals, /body:has\(\.member-dashboard-shell\) \.site-footer\s*\{\s*display:\s*none;\s*\}/);
  assert.match(adminGlobals, /body:has\(\.admin-shell\) \.site-head/);
});

test("signing in lands on the member dashboard and the separate-member chrome replaces public search", async () => {
  const [auth, page, topbar, guard, css] = await Promise.all([
    read("frontend/apps/main/app/auth/actions.ts"),
    read("frontend/apps/main/app/dashboard/page.tsx"),
    read("frontend/apps/main/components/member-topbar.tsx"),
    read("frontend/apps/main/components/session-guard.tsx"),
    read("frontend/apps/main/app/dashboard/dashboard.module.css"),
  ]);
  assert.match(auth, /signInWithPassword[\s\S]*?redirect\("\/dashboard"\)/);
  assert.doesNotMatch(auth, /auth\/complete/);
  assert.match(page, /<MemberTopbar/);
  assert.match(page, /<SessionGuard scope="member" timeoutMs=\{MEMBER_INACTIVITY_MS\}/);
  assert.match(page, /from\("notifications"\)/);
  assert.match(page, /markNotificationsRead/);
  assert.match(page, /quickActions/);
  assert.equal((page.match(/className="btn-(?:primary|secondary)" href="\/dashboard\?tab=/g) ?? []).length >= 3, true);
  assert.doesNotMatch(page, /styles\.signOut/);
  assert.match(topbar, /<BellIcon/);
  assert.doesNotMatch(topbar, /SearchIcon/);
  assert.match(topbar, /<SignOutIcon/);
  assert.match(topbar, /<form action=\{signOut\}/);
  assert.match(topbar, /memberMenuIcon/);
  assert.match(topbar, /<BrandedDialog/);
  assert.match(css, /\.topbar\s*\{[^}]*background:\s*var\(--palette-midnight\)/);
  assert.match(css, /\.memberMenuIcon\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*6px\)/);
  assert.match(guard, /ACTIVITY_EVENTS/);
  assert.match(guard, /BrandedDialog/);
});

test("member inactivity is one week and staff inactivity is ten hours, enforced on client and server", async () => {
  const [policy, adminPolicy, page, adminGuard, adminLayout, sameOriginLayout, signoutRoute, login, adminLogin] = await Promise.all([
    read("frontend/apps/main/lib/session-policy.ts"),
    read("frontend/apps/admin/lib/session-policy.ts"),
    read("frontend/apps/main/app/dashboard/page.tsx"),
    read("frontend/apps/admin/components/admin-access-guard.tsx"),
    read("frontend/apps/admin/app/(protected)/layout.tsx"),
    read("frontend/apps/main/app/admin/(protected)/layout.tsx"),
    read("frontend/apps/main/app/auth/signout/route.ts"),
    read("frontend/apps/main/app/auth/actions.ts"),
    read("frontend/apps/admin/lib/login-actions.ts"),
  ]);
  for (const source of [policy, adminPolicy]) {
    assert.match(source, /MEMBER_INACTIVITY_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
    assert.match(source, /STAFF_INACTIVITY_MS = 10 \* 60 \* 60 \* 1000/);
    assert.match(source, /export function isInactiveSince/);
  }
  assert.match(page, /isInactiveSince\(cookieStore\.get\(ACTIVITY_COOKIE\.member\)/);
  assert.match(page, /redirect\("\/auth\/signout\?scope=member"\)/);
  assert.match(adminGuard, /isInactiveSince\(cookieStore\.get\(ACTIVITY_COOKIE\.staff\)/);
  assert.match(adminGuard, /STAFF_INACTIVITY_MS/);
  assert.match(adminLayout, /<SessionGuard scope="staff" timeoutMs=\{STAFF_INACTIVITY_MS\}/);
  assert.match(sameOriginLayout, /<SessionGuard scope="staff" timeoutMs=\{STAFF_INACTIVITY_MS\}/);
  assert.match(signoutRoute, /supabase\.auth\.signOut\(\)/);
  assert.match(signoutRoute, /maxAge: 0/);
  assert.match(login, /cookieStore\.set\(ACTIVITY_COOKIE\.member/);
  assert.match(adminLogin, /cookieStore\.set\(ACTIVITY_COOKIE\.staff/);
});

test("member story covers show views, read time and comments, with a floating branded comment button", async () => {
  const [newsContent, coverStats, dock, article, deleteButton, actions, migration] = await Promise.all([
    read("frontend/apps/main/app/dashboard/news-content.tsx"),
    read("frontend/apps/main/components/article-cover-stats.tsx"),
    read("frontend/apps/main/components/comment-dock.tsx"),
    read("frontend/apps/main/app/news/[slug]/page.tsx"),
    read("frontend/apps/main/components/comment-delete-button.tsx"),
    read("frontend/apps/main/app/news/comment-actions.ts"),
    read("backend/supabase/migrations/20261116120000_article_engagement.sql"),
  ]);
  assert.match(newsContent, /published_article_engagement/);
  assert.match(newsContent, /view_count/);
  assert.match(newsContent, /read_minutes/);
  assert.match(newsContent, /comment_count/);
  assert.match(newsContent, /<StoryStats stats=\{stats\} \/>/);
  assert.match(coverStats, /estimateReadMinutes/);
  assert.match(coverStats, /min read/);
  assert.match(article, /<ArticleCoverStats body=\{body\} engagement=\{engagement\} commentCount=\{commentCount\} \/>/);
  assert.match(article, /<CommentDock /);
  assert.match(dock, /className="comment-fab"/);
  assert.match(dock, /aria-haspopup="dialog"/);
  assert.match(dock, /<BrandedDialog/);
  assert.match(dock, /postArticleComment/);
  assert.match(deleteButton, /<BrandedDialog/);
  assert.match(deleteButton, /deleteArticleComment/);
  assert.match(deleteButton, /btn-danger/);
  assert.match(actions, /rpc\("comment_delete"/);
  assert.match(migration, /create table if not exists public\.article_views/);
  assert.match(migration, /unique \(article_id, viewer_key, viewed_on\)/);
  assert.match(migration, /create or replace function public\.record_article_view/);
  assert.match(migration, /create or replace view public\.published_article_engagement/);
  assert.match(migration, /revoke all on table public\.article_views/);
});
