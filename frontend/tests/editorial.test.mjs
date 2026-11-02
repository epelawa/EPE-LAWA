import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, transition, publishedContent } from '../../backend/packages/editorial/src/index.ts';

const writer = { id: 'writer-test', active: true, capabilities: ['draft.create', 'draft.edit.own', 'draft.submit'] };
const editor = { id: 'editor-test', active: true, capabilities: ['article.review', 'article.approve', 'article.publish', 'article.unpublish'] };
const content = { title: 'Synthetic title', summary: 'Synthetic summary', body: 'Synthetic test body.' };
function success(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.article; }

test('only a separately approved version is published and draft edits cannot change it', () => {
  let article = success(createDraft(writer, 'article-1', 'v1', content));
  assert.equal(publishedContent(article), null);
  assert.equal(transition(article, editor, { action: 'publish', expectedRevision: 1 }).ok, false);
  article = success(transition(article, writer, { action: 'submit', expectedRevision: 1 }));
  assert.equal(transition(article, { ...writer, capabilities: [...writer.capabilities, 'article.approve'] }, { action: 'approve', expectedRevision: 2 }).ok, false);
  article = success(transition(article, editor, { action: 'approve', expectedRevision: 2 }));
  const publication = transition(article, editor, { action: 'publish', expectedRevision: 3 });
  assert.deepEqual(publication.audit, { articleId: 'article-1', versionId: 'v1', actorId: 'editor-test', action: 'publish', revision: 4 });
  article = success(publication);
  assert.deepEqual(publishedContent(article), content);
  const changed = { title: 'Private change', summary: '', body: 'Unpublished synthetic revision.' };
  const revision = success(transition(article, writer, { action: 'edit', versionId: 'v2', content: changed, expectedRevision: 4 }));
  assert.deepEqual(publishedContent(revision), content);
  assert.equal(revision.versions[0].content.title, 'Synthetic title');
  assert.equal(article.revision, 4, 'input is not mutated');
  revision.versions[0].content.title = 'mutated result';
  assert.equal(article.versions[0].content.title, 'Synthetic title', 'separate snapshots do not share content references');
  revision.versions[0].content.title = 'Synthetic title';
  assert.equal(transition(revision, editor, { action: 'publish', expectedRevision: 5 }).ok, false);
  const withdrawn = success(transition(revision, editor, { action: 'unpublish', expectedRevision: 5 }));
  assert.equal(publishedContent(withdrawn), null);
});

test('deny missing permissions, stale updates and invalid workflows', () => {
  const article = success(createDraft(writer, 'a1', 'v1', content));
  const other = { id: 'other', active: true, capabilities: ['draft.edit.own', 'draft.submit'] };
  assert.deepEqual(createDraft({ ...writer, active: false }, 'a', 'v', content), { ok: false, error: 'denied' });
  assert.deepEqual(transition(article, other, { action: 'edit', versionId: 'v2', content, expectedRevision: 1 }), { ok: false, error: 'denied' });
  assert.deepEqual(transition(article, writer, { action: 'edit', versionId: 'v2', content, expectedRevision: 0 }), { ok: false, error: 'conflict' });
  assert.deepEqual(transition(article, writer, { action: 'edit', versionId: 'v1', content, expectedRevision: 1 }), { ok: false, error: 'invalid' });
  assert.deepEqual(transition(article, writer, { action: 'edit', versionId: 'v2', content: { ...content, body: '  ' }, expectedRevision: 1 }), { ok: false, error: 'invalid' });
  assert.deepEqual(transition(article, editor, { action: 'approve', expectedRevision: 1 }), { ok: false, error: 'invalid' });
  const review = success(transition(article, writer, { action: 'submit', expectedRevision: 1 }));
  assert.deepEqual(transition(review, writer, { action: 'edit', versionId: 'v2', content, expectedRevision: 2 }), { ok: false, error: 'invalid' });
  assert.equal(publishedContent({ ...article, publishedVersionId: 'v1' }), null, 'draft cannot become public through a pointer');
  assert.equal(publishedContent({ ...article, publishedVersionId: 'other' }), null);
  assert.equal(publishedContent({ ...article, versions: [...article.versions, article.versions[0]] }), null);
});

test('content inputs and public outputs are copied, not mutable references', () => {
  const input = { ...content };
  let article = success(createDraft(writer, 'a1', 'v1', input));
  input.title = 'changed outside';
  assert.equal(article.versions[0].content.title, content.title);
  article = success(transition(article, writer, { action: 'submit', expectedRevision: 1 }));
  article = success(transition(article, editor, { action: 'approve', expectedRevision: 2 }));
  article = success(transition(article, editor, { action: 'publish', expectedRevision: 3 }));
  const projection = publishedContent(article);
  projection.title = 'changed outside';
  assert.equal(publishedContent(article).title, content.title);
  assert.deepEqual(Object.keys(projection).sort(), ['body', 'summary', 'title']);
});


test('review can request revision, while owner and latest editor cannot self-approve', () => {
  let article = success(createDraft(writer, 'a1', 'v1', content));
  article = success(transition(article, writer, { action: 'submit', expectedRevision: 1 }));
  assert.deepEqual(transition(article, writer, { action: 'request_revision', expectedRevision: 2 }), { ok: false, error: 'denied' });
  const response = transition(article, editor, { action: 'request_revision', expectedRevision: 2 });
  assert.equal(response.audit.action, 'request_revision');
  article = success(response);
  const otherEditor = { id: 'other-editor', active: true, capabilities: ['draft.edit.any', 'draft.submit', 'article.approve'] };
  article = success(transition(article, otherEditor, { action: 'edit', expectedRevision: 3, versionId: 'v2', content }));
  article = success(transition(article, otherEditor, { action: 'submit', expectedRevision: 4 }));
  const ownerApprover = { ...writer, capabilities: [...writer.capabilities, 'article.approve'] };
  assert.deepEqual(transition(article, ownerApprover, { action: 'approve', expectedRevision: 5 }), { ok: false, error: 'denied' });
  assert.deepEqual(transition(article, otherEditor, { action: 'approve', expectedRevision: 5 }), { ok: false, error: 'denied' });
  assert.equal(transition(article, editor, { action: 'approve', expectedRevision: 5 }).ok, true);
  assert.deepEqual(transition({ ...article, revision: Number.MAX_SAFE_INTEGER }, editor, { action: 'approve', expectedRevision: Number.MAX_SAFE_INTEGER }), { ok: false, error: 'invalid' });
});


test('a corrected version needs its own review and approval before replacing the public snapshot', () => {
  let a = success(createDraft(writer, 'a1', 'v1', content));
  a = success(transition(a, writer, { action: 'submit', expectedRevision: 1 }));
  a = success(transition(a, editor, { action: 'approve', expectedRevision: 2 }));
  a = success(transition(a, editor, { action: 'publish', expectedRevision: 3 }));
  const updated = { title: 'Corrected title', summary: 'Correction', body: 'Synthetic corrected body.' };
  a = success(transition(a, writer, { action: 'edit', versionId: 'v2', content: updated, expectedRevision: 4 }));
  a = success(transition(a, writer, { action: 'submit', expectedRevision: 5 }));
  assert.deepEqual(publishedContent(a), content);
  a = success(transition(a, editor, { action: 'approve', expectedRevision: 6 }));
  assert.deepEqual(publishedContent(a), content, 'approval alone does not replace public snapshot');
  a = success(transition(a, editor, { action: 'publish', expectedRevision: 7 }));
  assert.deepEqual(publishedContent(a), updated);
  assert.equal(a.versions.find(v => v.id === 'v1').state, 'approved');
});

test('transaction contract gives fresh publication/withdrawal and rejects racing writes', async () => {
  const { executeEditorialCommand, readPublishedArticle } = await import('../../backend/packages/editorial/src/index.ts');
  let stored = success(createDraft(writer, 'a1', 'v1', content));
  const events = [];
  let calls = 0;
  // Synthetic repository only: a real implementation must make this an atomic DB transaction.
  const repo = {
    async loadArticle(id) { calls++; return id === stored.id ? structuredClone(stored) : null; },
    async compareAndCommit(id, expected, next, audit) {
      if (id !== stored.id || stored.revision !== expected) return 'conflict';
      stored = structuredClone(next);
      events.push(structuredClone(audit));
      return 'committed';
    },
  };
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: false, error: 'not_found' });
  const race = await Promise.all([
    executeEditorialCommand(repo, 'a1', writer, { action: 'submit', expectedRevision: 1 }),
    executeEditorialCommand(repo, 'a1', writer, { action: 'submit', expectedRevision: 1 }),
  ]);
  assert.equal(race.filter(r => r.ok).length, 1);
  assert.deepEqual(race.find(r => !r.ok), { ok: false, error: 'conflict' });
  assert.equal(events.length, 1);
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', editor, { action: 'approve', expectedRevision: 2 }), { ok: true, revision: 3 });
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', editor, { action: 'publish', expectedRevision: 3 }), { ok: true, revision: 4 });
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: true, content });
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', editor, { action: 'unpublish', expectedRevision: 4 }), { ok: true, revision: 5 });
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: false, error: 'not_found' });
  assert.ok(calls >= 6, 'every read/command loads current state');
  assert.deepEqual(events.map(e => e.action), ['submit', 'approve', 'publish', 'unpublish']);
});

test('transaction contract fails closed on missing data, invalid adapters and provider errors', async () => {
  const { executeEditorialCommand, readPublishedArticle } = await import('../../backend/packages/editorial/src/index.ts');
  const article = success(createDraft(writer, 'a1', 'v1', content));
  let commits = 0;
  const repo = {
    async loadArticle() { return structuredClone(article); },
    async compareAndCommit() { commits++; throw new Error('database failure'); },
  };
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', writer, { action: 'submit', expectedRevision: 1 }), { ok: false, error: 'unavailable' });
  assert.equal(commits, 1);
  repo.loadArticle = async () => { throw new Error('database unavailable'); };
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: false, error: 'unavailable' });
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', writer, { action: 'submit', expectedRevision: 1 }), { ok: false, error: 'unavailable' });
  repo.loadArticle = async () => null;
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: false, error: 'not_found' });
  assert.deepEqual(await executeEditorialCommand(repo, 'a1', writer, { action: 'submit', expectedRevision: 1 }), { ok: false, error: 'not_found' });
  repo.loadArticle = async () => ({ ...article, id: 'other' });
  assert.deepEqual(await readPublishedArticle(repo, 'a1'), { ok: false, error: 'unavailable' });
});
