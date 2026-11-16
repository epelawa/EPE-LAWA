import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { articlePublicationState, hasConfirmedArticleUnpublish } from "../apps/admin/lib/article-publication-state.ts";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [editor, actions, liveSchema] = await Promise.all([
  read("frontend/apps/admin/app/(protected)/newsroom/[id]/page.tsx"),
  read("frontend/apps/admin/lib/actions.ts"),
  read("backend/supabase/migrations/20261114235700_newsroom_authoring_live_schema.sql"),
]);

test("an older published version keeps takedown controls visible while the current version is private", () => {
  const syntheticArticle = {
    currentVersionId: "private-current-version",
    publishedVersionId: "older-public-version",
  };
  assert.deepEqual(articlePublicationState(syntheticArticle), {
    hasPublishedVersion: true,
    currentVersionIsPublic: false,
    olderVersionRemainsPublic: true,
  });
  assert.match(editor, /hasPublishedVersion \? <Panel>/);
  assert.match(editor, /olderVersionRemainsPublic[\s\S]*?older version remains live while this current version is private/i);
  assert.match(editor, /name="confirmUnpublish" value="yes" required/);
  assert.match(editor, /Unpublish public article/);
});

test("takedown requires explicit confirmation in both the form and server action", () => {
  const formData = new FormData();
  assert.equal(hasConfirmedArticleUnpublish(formData.get("confirmUnpublish")), false);
  formData.set("confirmUnpublish", "no");
  assert.equal(hasConfirmedArticleUnpublish(formData.get("confirmUnpublish")), false);
  formData.set("confirmUnpublish", "yes");
  assert.equal(hasConfirmedArticleUnpublish(formData.get("confirmUnpublish")), true);
  assert.match(actions, /hasConfirmedArticleUnpublish\(rawText\(formData, "confirmUnpublish"\)\)/);
  assert.match(actions, /error=unpublish_confirmation/);
});

test("confirmed older-version takedown uses only the existing article_unpublish RPC with the article revision", async () => {
  const article = {
    id: "00000000-0000-4000-8000-000000000123",
    revision: 27,
    currentVersionId: "synthetic-private-v3",
    publishedVersionId: "synthetic-public-v2",
  };
  const state = articlePublicationState(article);
  assert.equal(state.hasPublishedVersion, true);
  assert.equal(state.currentVersionIsPublic, false);
  assert.equal(hasConfirmedArticleUnpublish("yes"), true);

  const rpcCalls = [];
  const syntheticRpcStub = async (name, args) => {
    rpcCalls.push({ name, args });
    assert.equal(name, "article_unpublish");
    assert.deepEqual(args, {
      p_article_id: article.id,
      p_expected_revision: article.revision,
    });
    // Model only the existing RPC's observed pointer behavior on synthetic data.
    const versionIdAudited = article.publishedVersionId;
    assert.ok(versionIdAudited, "the RPC requires a public version pointer");
    article.publishedVersionId = null;
    article.revision += 1;
    return { versionIdAudited };
  };

  const request = {
    p_article_id: article.id,
    p_expected_revision: article.revision,
  };
  const result = await syntheticRpcStub("article_unpublish", request);
  assert.deepEqual(rpcCalls, [{ name: "article_unpublish", args: request }]);
  assert.equal(result.versionIdAudited, "synthetic-public-v2");
  assert.equal(article.currentVersionId, "synthetic-private-v3", "unpublish must not publish or alter the private current version");
  assert.equal(article.publishedVersionId, null, "unpublish clears the old public pointer");
  assert.equal(article.revision, 28);

  assert.match(actions, /supabase\.rpc\(rpcName, \{ p_article_id: articleId, p_expected_revision: revision \}\)/);
  assert.match(actions, /articleTransition\(formData, "article_unpublish", "unpublished"\)/);
});

test("the current guarded SQL checks capability and revision, locks the article, and clears/audits the published pointer", () => {
  const start = liveSchema.indexOf("create or replace function public.article_unpublish(");
  assert.notEqual(start, -1);
  const end = liveSchema.indexOf("\n$$;", start);
  assert.notEqual(end, -1);
  const rpc = liveSchema.slice(start, end);
  assert.match(rpc, /p_article_id uuid,\s*p_expected_revision bigint/);
  assert.match(rpc, /perform public\.require_capability\('article\.unpublish'\)/);
  assert.match(rpc, /for update/);
  assert.match(rpc, /if v_revision <> p_expected_revision/);
  assert.match(rpc, /if v_published is null/);
  assert.match(rpc, /set published_version_id = null/);
  assert.match(rpc, /jsonb_build_object\('version_id', v_published\)/);
  assert.doesNotMatch(rpc, /current_version_id/);
  assert.match(liveSchema, /grant execute on function public\.article_unpublish\(uuid, bigint\) to authenticated/);
});
