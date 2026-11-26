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
  assert.match(category, /No public threads in this category yet/);
  assert.match(category, /notFound\(\)/);
});

test("Forum thread view uses user-scoped reads and exposes member reply/report controls", async () => {
  const page = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  const actions = await source("../apps/main/app/forum/actions.ts");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  // Turn 3: the composer is a client component that keeps the draft on failure.
  assert.match(page, /<ReplyComposer threadId=\{thread\.id\} threadSlug=\{thread\.slug\} \/>/);
  const composer = await source("../apps/main/app/forum/reply-composer.tsx");
  assert.match(composer, /useActionState\(replyWithState/);
  assert.match(composer, /disabled=\{pending \|\| empty\}/);
  assert.match(composer, /Your message is still here/);
  assert.match(actions, /export async function replyToThread/, "no-JS redirect action is kept");
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
  assert.match(threadPage, /!user \? <Notice[^>]*>Sign in to reply/);
  assert.match(actions, /if \(error \|\| !user\) redirect\(`\/login\?next=/);
});

test("polls use the atomic creation RPC, single-choice authenticated voting, and aggregate-only results", async () => {
  const actions = await source("../apps/main/app/forum/actions.ts");
  const form = await source("../apps/main/app/forum/new/new-thread-form.tsx");
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
  assert.match(thread, /from\("profiles"\)\.select\("user_id,handle,display_name,is_verified,verified_at,deleted_at,avatar_key"\)/);
  assert.match(thread, /profile\?\.is_verified && profile\.verified_at/);
  assert.match(thread, /profile\.deleted_at/);
  assert.doesNotMatch(thread, /public office|office verified/i);
});

test("forum create/reply failures are allow-listed and shown on their redirect route", async () => {
  const page = await source("../apps/main/app/forum/page.tsx");
  const actions = await source("../apps/main/app/forum/actions.ts");
  const thread = await source("../apps/main/app/forum/thread/[slug]/page.tsx");
  assert.match(actions, /redirect\(`\/forum\?forum_error=\$\{encodeURIComponent\(message\)\}`\)/);
  assert.doesNotMatch(actions, /\?error=/);
  assert.match(page, /searchParams: Promise<SearchParams>/);
  assert.match(page, /params\.forum_error/);
  assert.match(page, /safeErrors\.has\(requestedError\)/);
  assert.match(page, /<Notice role="alert" tone="danger">\{actionError\}<\/Notice>/);
  assert.match(thread, /forum_error\?: string/);
  assert.doesNotMatch(page, /<Notice[^>]*>\{params\.error\}/);
  // Client forms return the error in place instead of redirecting, so typed input survives.
  assert.match(actions, /return \{ status: "error", message: outcome\.message, attempt: previous\.attempt \+ 1 \}/);
  const form = await source("../apps/main/app/forum/new/new-thread-form.tsx");
  assert.match(form, /Nothing was published and your text is still here/);
});
