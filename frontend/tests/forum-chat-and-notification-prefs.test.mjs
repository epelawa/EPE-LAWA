import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("forum categories are seeded by an idempotent migration and live on the listing route", async () => {
  const seed = await source("../../backend/supabase/migrations/20261124140000_forum_categories_seed.sql");
  assert.match(seed, /insert into public\.forum_categories/);
  assert.match(seed, /on conflict \(slug\) do nothing/);
  for (const slug of ["welcome", "general", "community-matters", "marketplace", "events", "health", "learning-jobs", "housing"]) {
    assert.match(seed, new RegExp(`\\('${slug}',`));
  }
});

test("forum listing reads as a chat app: app bar, topic rail, conversation stream", async () => {
  const page = await source("../apps/main/app/forum/page.tsx");
  const css = await source("../apps/main/app/forum/forum.module.css");
  for (const needle of ["forum-shell", "ForumLiveCount", "Start a discussion", "sortHref", "formatLagosDateTime", "/forum/category/", "/forum/thread/"]) {
    assert.match(page, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), needle);
  }
  assert.doesNotMatch(css, /backdrop-filter/);
  for (const needle of [".appBar", ".split", ".rail", ".railList", ".stream", ".chatList", ".sortLink", ".pinnedBadge", ".postAvatar", "max-width: 860px", "prefers-reduced-motion"]) {
    assert.match(css, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), needle);
  }
});

test("the global footer is suppressed on every forum surface", async () => {
  const globals = await source("../apps/main/app/globals.css");
  assert.match(globals, /body:has\(\.forum-shell\) \.site-footer \{ display: none; \}/);
  for (const page of [
    "../apps/main/app/forum/page.tsx",
    "../apps/main/app/forum/category/[slug]/page.tsx",
    "../apps/main/app/forum/thread/[slug]/page.tsx",
    "../apps/main/app/forum/new/page.tsx",
  ]) {
    assert.match(await source(page), /forum-shell/, page);
  }
});

test("notification channel preferences are dashboard-only with a session-scoped upsert", async () => {
  const actions = await source("../apps/main/app/dashboard/actions.ts");
  assert.match(actions, /updateNotificationPreferences/);
  assert.match(actions, /from\("notification_preferences"\)[\s\S]*?upsert\(\{ user_id: user\.id/);
  assert.doesNotMatch(actions, /service.?role/i);

  const page = await source("../apps/main/app/dashboard/page.tsx");
  assert.match(page, /NotificationPreferencesPanel/);
  assert.match(page, /from\("notification_preferences"\)[\s\S]*?maybeSingle\(\)/);
  assert.match(page, /updateNotificationPreferences/);
  for (const channel of ["in_app_news", "in_app_radio", "in_app_comments", "in_app_forum", "push_news", "push_radio", "push_comments", "push_forum"]) {
    assert.match(page, new RegExp(channel), channel);
  }
  const css = await source("../apps/main/app/dashboard/dashboard.module.css");
  assert.match(css, /\.prefsPanel/);
  assert.match(css, /\.prefSwitch/);
});
