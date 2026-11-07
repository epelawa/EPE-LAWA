import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Forum routes link only real categories/threads and render honest empty/error states", async () => {
  const page = await source("../apps/main/app/forum/page.tsx");
  const category = await source("../apps/main/app/forum/category/[slug]/page.tsx");
  assert.match(page, /forum_categories/);
  assert.match(page, /forum\/category\//);
  assert.match(page, /forum\/thread\//);
  assert.match(page, /No forum categories are available/);
  assert.match(category, /No public threads have been posted/);
  assert.match(category, /notFound\(\)/);
});

test("Forum thread view uses user-scoped reads and exposes member reply/report controls", async () => {
  const page = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  const actions = await source("../apps/main/app/forum/actions.ts");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /replyToThread/);
  assert.match(page, /reportPost/);
  assert.match(actions, /from\("forum_posts"\)\.insert/);
  assert.match(actions, /from\("forum_reports"\)\.insert/);
  assert.match(actions, /supabase\.rpc\("forum_create_thread"/);
  assert.match(actions, /auth\.getUser\(\)/);
  assert.doesNotMatch(actions, /service.?role/i);
});

test("anonymous users are redirected to sign-in before creating or replying", async () => {
  const createPage = await source("../apps/main/app/forum/new/page.tsx");
  const threadPage = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  const actions = await source("../apps/main/app/forum/actions.ts");
  assert.match(createPage, /if \(!user\) redirect\("\/login/);
  assert.match(threadPage, /!user \? <p className="mt-8 card p-5">Sign in to reply/);
  assert.match(actions, /if \(error \|\| !user\) redirect\(`\/login\?next=/);
});

test("polls use the atomic creation RPC, single-choice authenticated voting, and aggregate-only results", async () => {
  const actions = await source("../apps/main/app/forum/actions.ts");
  const form = await source("../apps/main/app/forum/new/page.tsx");
  const thread = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  const migration = await source("../../backend/supabase/migrations/20261107215000_forum_single_vote.sql");
  assert.match(actions, /p_poll_question: pollQuestion \|\| null/);
  assert.match(actions, /p_poll_options: pollQuestion \? options : null/);
  assert.match(actions, /supabase\.rpc\("forum_vote"/);
  assert.match(actions, /options\.length < 2 \|\| options\.length > 10/);
  assert.match(form, /name="poll_question"/);
  assert.match(form, /name="poll_option"/);
  assert.match(thread, /forum_poll_results/);
  assert.match(thread, /Choose one answer/);
  assert.match(thread, /totals only; ballots are private/);
  assert.match(migration, /unique index if not exists forum_poll_votes_one_vote_per_member[\s\S]*?\(poll_id, voter_id\)/);
  assert.match(migration, /when unique_violation[\s\S]*?message = 'already_voted'/);
  assert.doesNotMatch(thread, /select\("poll_id,option_id,voter_id/);
});

test("thread authors are sourced from real profiles; no public-office claim is inferred", async () => {
  const thread = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  assert.match(thread, /from\("profiles"\)\.select\("user_id,handle,display_name,is_verified,verified_at,deleted_at"\)/);
  assert.match(thread, /profile\?\.is_verified && profile\.verified_at/);
  assert.match(thread, /profile\.deleted_at/);
  assert.doesNotMatch(thread, /public office|office verified/i);
});
