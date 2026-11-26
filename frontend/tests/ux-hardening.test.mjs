import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const repo = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("live-validation toolkit ships from the ui package", () => {
  const forms = repo("frontend/packages/ui/src/forms.tsx");
  for (const name of ["LiveField", "SubmitButton", "SaveState", "validateField", "controlError", "ep-shake"]) {
    assert.ok(forms.includes(name), `forms.tsx should define or use ${name}`);
  }
  assert.ok(!forms.includes('styles from "./forms.css"'), "forms.tsx must not import a CSS module");
  const index = repo("frontend/packages/ui/src/index.tsx");
  assert.match(index, /export \{[^}]*controlError[^}]*\} from "\.\/forms"/);
  const pkg = JSON.parse(repo("frontend/packages/ui/package.json"));
  assert.equal(pkg.exports["./forms.css"], "./src/forms.css");
});

test("forms.css ships reduced-motion-safe control styling", () => {
  const css = repo("frontend/packages/ui/src/forms.css");
  assert.match(css, /\.ep-shake/);
  assert.match(css, /\.ep-btn__spinner/);
  assert.match(css, /\.ep-save--saved/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("both apps load the forms stylesheet", () => {
  for (const app of ["main", "admin"]) {
    assert.match(
      repo(`frontend/apps/${app}/app/layout.tsx`),
      /import "@epelawa\/ui\/forms.css"/,
      `${app} layout should import forms.css`,
    );
  }
});

test("flagship forms dropped native validation in favour of shared rules", () => {
  for (const path of [
    "frontend/apps/main/app/business-directory/submit/business-form.tsx",
    "frontend/apps/admin/components/news-article-composer.tsx",
    "frontend/apps/admin/components/progressive-editor.tsx",
    "frontend/apps/main/app/auth/auth-forms.tsx",
  ]) {
    const source = repo(path);
    assert.ok(!source.includes("reportValidity"), `${path} must not call reportValidity`);
  }
  assert.match(repo("frontend/apps/main/app/business-directory/submit/business-form.tsx"), /noValidate/);
  assert.match(repo("frontend/apps/admin/components/news-article-composer.tsx"), /noValidate/);
});

test("confirm-submit uses the branded dialog, not window.confirm", () => {
  const source = repo("frontend/apps/admin/components/confirm-submit.tsx");
  assert.ok(!source.includes("window.confirm"), "window.confirm removed");
  assert.match(source, /BrandedDialog/);
});

test("live queue counts cover every pending-work queue", () => {
  const route = repo("frontend/apps/main/app/api/live/queues/route.ts");
  for (const table of ["events", "radio_song_requests", "moderation_appeals", "forum_reports"]) {
    assert.match(route, new RegExp(`from\\("${table}"\\)`), `route should count ${table}`);
  }
  // The events and song-request admin queues were withdrawn in 43835ed ("Remove digest, poll, events,
  // and radio/requests pages from admin"), so the sidebar hook exposes only queues with a staff page.
  const hook = repo("frontend/apps/admin/components/use-live-queue-counts.ts");
  for (const key of ["submissions", "corrections", "enquiries", "appeals", "forumReports"]) {
    assert.match(hook, new RegExp(`${key}: number \\| null`));
  }
  for (const key of ["events", "songRequests"]) {
    assert.doesNotMatch(hook, new RegExp(`${key}: number \\| null`), `${key} has no admin page to badge`);
  }
});

test("admin sidebar renders superscript badges on queue links", () => {
  const sidebar = repo("frontend/apps/admin/components/admin-sidebar.tsx");
  assert.match(sidebar, /useLiveQueueCounts/);
  assert.match(sidebar, /admin-sidebar__badge/);
  assert.match(sidebar, /\/moderation\/forum/);
  assert.match(repo("frontend/apps/admin/app/globals.css"), /\.admin-sidebar__badge/);
});

test("admin route links keep normal navigation and expose immediate pending feedback", () => {
  const sidebar = repo("frontend/apps/admin/components/admin-sidebar.tsx");
  // Since 43835ed sidebar links are real anchors that show a spinner immediately and then do a
  // full document navigation (the owner's fix for links that appeared unresponsive).
  assert.match(sidebar, /function NavLink\(/);
  assert.match(sidebar, /<a\s+href=\{href\}/);
  assert.match(sidebar, /aria-busy=\{isPending\}/);
  assert.match(sidebar, /window\.location\.href = href/);
  assert.match(sidebar, /role="status" aria-live="polite"/);
  assert.match(repo("frontend/apps/admin/app/globals.css"), /\.drawer-root\[data-open=true\] \.drawer/);
  assert.match(repo("frontend/apps/admin/app/globals.css"), /admin-sidebar__nav-spinner\[data-active=true\]/);
});

test("both newsroom upload entry points share the composer and preserve route fallbacks", () => {
  const page = repo("frontend/apps/admin/app/(protected)/newsroom/page.tsx");
  const modal = repo("frontend/apps/admin/components/composer-modal.tsx");
  assert.equal((page.match(/<ComposerTrigger/g) ?? []).length, 2);
  assert.match(page, /defaultOpen=\{compose === "1" && canCompose\}/);
  assert.match(page, /adminHref\("\/newsroom\/new"\)/);
  assert.match(modal, /ComposerContext\.Provider/);
  assert.match(modal, /onClick=\{\(event\) => openComposer\(event\.currentTarget\)\}/);
});

test("backup controls surface an actionable configuration alert", () => {
  const dispatch = repo("frontend/apps/admin/lib/backup-dispatch.ts");
  assert.match(dispatch, /export function backupDispatchConfigured/);
  const controls = repo("frontend/apps/admin/components/backup-controls.tsx");
  assert.match(controls, /dispatchConfigured/);
  assert.match(controls, /BACKUP_DISPATCH_TOKEN/);
});

test("analytics ambiguity fix migration exists", () => {
  const migration = repo("backend/supabase/migrations/20261122113000_staff_analytics_ambiguity_fix.sql");
  for (const alias of ["span_day", "view_total", "click_total", "member_total", "metric_total"]) {
    assert.match(migration, new RegExp(alias), `migration should alias to ${alias}`);
  }
  assert.doesNotMatch(migration, /coalesce\(c\.total/);
});

test("ux audit sweep script and report exist", () => {
  const script = repo("scripts/ux-audit.mjs");
  assert.match(script, /native-confirm/);
  assert.match(script, /reportValidity/);
  const report = repo("docs/ux-audit-report.md");
  assert.match(report, /# UX audit sweep/);
});

test("layouts preconnect the supabase and R2 origins when configured", () => {
  for (const app of ["main", "admin"]) {
    const layout = repo(`frontend/apps/${app}/app/layout.tsx`);
    assert.match(layout, /rel="preconnect"/);
    assert.match(layout, /NEXT_PUBLIC_SUPABASE_URL/);
  }
});
