import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [actions, createPage, editPage, adminLayout, publicAdminLayout, listing, article, schema] = await Promise.all([
  read("frontend/apps/admin/lib/actions.ts"),
  read("frontend/apps/admin/app/(protected)/newsroom/new/page.tsx"),
  read("frontend/apps/admin/app/(protected)/newsroom/[id]/page.tsx"),
  read("frontend/apps/admin/app/(protected)/layout.tsx"),
  read("frontend/apps/main/app/admin/(protected)/layout.tsx"),
  read("frontend/apps/main/app/news/page.tsx"),
  read("frontend/apps/main/app/news/[slug]/page.tsx"),
  read("backend/supabase/migrations/20261107195000_direct_article_publish_verified_staff.sql"),
]);

test("authorized newsroom create and edit use guarded database transitions, not direct table writes", () => {
  assert.match(createPage, /staff_capability_grants/);
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
