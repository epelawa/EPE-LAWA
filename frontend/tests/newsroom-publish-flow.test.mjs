import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [actions, createPage, editPage, adminLayout, publicAdminLayout, listing, newsroomListing, article, schema, liveSchema] = await Promise.all([
  read("frontend/apps/admin/lib/actions.ts"),
  read("frontend/apps/admin/app/(protected)/newsroom/new/page.tsx"),
  read("frontend/apps/admin/app/(protected)/newsroom/[id]/page.tsx"),
  read("frontend/apps/admin/app/(protected)/layout.tsx"),
  read("frontend/apps/main/app/admin/(protected)/layout.tsx"),
  read("frontend/apps/main/app/news/page.tsx"),
  read("frontend/apps/admin/app/(protected)/newsroom/page.tsx"),
  read("frontend/apps/main/app/news/[slug]/page.tsx"),
  read("backend/supabase/migrations/20261107195000_direct_article_publish_verified_staff.sql"),
  read("backend/supabase/migrations/20261114235700_newsroom_authoring_live_schema.sql"),
]);

test("authorized newsroom create and edit use guarded database transitions, not direct table writes", () => {
  assert.match(createPage, /rpc\("has_capability", \{ p_capability: "article\.create" \}\)/);
  assert.match(createPage, /article\.create/);
  assert.match(actions, /supabase\.rpc\("article_create"/);
  assert.match(actions, /supabase\.rpc\("article_draft_update"/);
  assert.match(editPage, /name="revision"/);
  assert.match(editPage, /action=\{editablePrivateVersion \? saveDraft : reviseArticle\}/);
  assert.doesNotMatch(actions, /\.from\("articles"\)\.(insert|update|upsert|delete)/);
});

test("direct publish is capability- and revision-checked server-side, and revalidates public routes", () => {
  assert.match(editPage, /article\.publish/);
  assert.match(editPage, /No second reviewer is required/);
  assert.match(editPage, /name="revision"/);
  assert.match(actions, /rpcName: "article_publish" \| "article_unpublish"/);
  assert.match(actions, /p_expected_revision: revision/);
  assert.match(actions, /revalidatePath\("\/news"\)/);
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(schema, /perform public\.require_capability\('article\.publish'\)/);
  assert.match(schema, /p_expected_revision/);
  assert.match(schema, /'publication_mode',\s*v_publication_mode/);
});

test("drafts stay private and the public list and article resolve only published_articles", () => {
  assert.match(createPage, /Create private draft/);
  assert.match(editPage, /Changes remain private/);
  assert.match(listing, /from\("published_articles"\)/);
  assert.match(listing, /newsArticlePath\(article\.slug\)/);
  assert.doesNotMatch(listing, /from\("articles"\)/);
  assert.match(article, /\.from\("published_articles"\)/);
  assert.match(article, /\.eq\("slug", slug\)/);
  assert.match(article, /if \(!data\) return \{ status: "missing" \}/);
  assert.doesNotMatch(article, /service_role|SUPABASE_SERVICE/);
});

test("all admin newsroom routes remain behind server-side protected layouts", () => {
  assert.match(adminLayout, /AdminAccessGuard/);
  assert.match(adminLayout, /loginPath="\/login"/);
  assert.match(publicAdminLayout, /AdminAccessGuard/);
});

test("live-schema Newsroom repair is forward-only, authenticated-only, and does not depend on articles.state", () => {
  const executableSql = liveSchema.replace(/^\s*--.*$/gm, "");
  assert.doesNotMatch(executableSql, /\b(drop|truncate|delete)\b/i);
  assert.doesNotMatch(executableSql, /\bcall\s+public\.(require_capability|audit_event)\b/i);
  assert.doesNotMatch(executableSql, /public\.articles\s+set\s+[^;]*\bstate\b/i);
  assert.match(executableSql, /create or replace function public\.article_publish[\s\S]*?security definer[\s\S]*?set search_path = ''/i);
  assert.match(executableSql, /revoke all on function public\.article_publish\(uuid, bigint\) from public, anon/i);
  assert.match(executableSql, /grant execute on function public\.article_publish\(uuid, bigint\) to authenticated/i);
  assert.match(executableSql, /set state = 'approved'/i);
  assert.match(executableSql, /if v_state is null or v_state not in \('draft', 'review'\)/i);
});

test("Newsroom reports public state from the published-version pointer and distinguishes query errors from missing articles", () => {
  assert.match(editPage, /const displayState = currentVersionIsPublic \? "published" : version\.state/);
  assert.match(newsroomListing, /state === "published"\) query = query\.not\("published_version_id", "is", null\)/);
  assert.match(newsroomListing, /const currentVersionIsPublic = Boolean\(article\.current_version_id && article\.published_version_id === article\.current_version_id\)/);
  assert.match(editPage, /query\.created[\s\S]*?Private article draft created/);
  assert.match(editPage, /if \(articleResult\.error\) \{[\s\S]*?role="alert"/);
  assert.match(editPage, /if \(!articleResult\.data\) notFound\(\)/);
  assert.doesNotMatch(editPage, /articleResult\.error\s*\|\|\s*!articleResult\.data/);
});

test("admin current-version joins use stable column hints rather than deployment-specific FK names", async () => {
  const [list, editor] = await Promise.all([
    read("frontend/apps/admin/app/(protected)/newsroom/page.tsx"),
    read("frontend/apps/admin/app/(protected)/newsroom/[id]/page.tsx"),
  ]);
  assert.match(list, /current_version:current_version_id\s*\(/);
  assert.match(editor, /current_version:article_versions!current_version_id\s*\(/);
  for (const source of [list, editor]) {
    assert.doesNotMatch(source, /articles_current_version(?:_fkey|_id_fkey)/);
  }
});
