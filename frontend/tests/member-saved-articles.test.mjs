import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("saved stories migration is owner-only, additive and revokes anonymous access", async () => {
  const sql = await read("backend/supabase/migrations/20261116140000_member_saved_articles.sql");
  assert.match(sql, /create table if not exists public\.saved_articles/);
  assert.match(sql, /references auth\.users \(id\) on delete cascade/);
  assert.match(sql, /references public\.articles \(id\) on delete cascade/);
  assert.match(sql, /unique \(user_id, article_id\)/);
  assert.match(sql, /alter table public\.saved_articles enable row level security/);
  assert.match(sql, /revoke all on table public\.saved_articles from public, anon/);
  assert.match(sql, /grant select, insert, delete on table public\.saved_articles to authenticated/);
  assert.equal((sql.match(/using \(user_id = \(select auth\.uid\(\)\)\)/g) ?? []).length, 2);
  assert.match(sql, /with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from)\b/i);
});

test("saving a story scopes every write to the signed-in member", async () => {
  const [action, button, page, article] = await Promise.all([
    read("frontend/apps/main/app/dashboard/saved-actions.ts"),
    read("frontend/apps/main/components/save-article-button.tsx"),
    read("frontend/apps/main/app/dashboard/page.tsx"),
    read("frontend/apps/main/app/news/[slug]/page.tsx"),
  ]);
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.match(action, /\.eq\("user_id", user\.id\)/);
  assert.match(action, /upsert\(\{ user_id: user\.id, article_id: articleId \}/);
  assert.match(action, /redirect\(`\/login\?next=/);
  assert.match(button, /name="intent"/);
  assert.match(button, /aria-pressed=\{saved\}/);
  assert.match(article, /<SaveArticleButton[\s\S]*saved=\{saved\}/);
  assert.match(article, /from\("saved_articles"\)\.select\("id", \{ count: "exact", head: true \}\)\.eq\("article_id", article\.id\)/);
  assert.match(page, /from\("saved_articles"\)/);
  assert.doesNotMatch(page, /Saving isn’t available yet/);
});
