/**
 * Isolated Phase 1 workflow model. NOT an API, database policy, persistence
 * layer or permission source. Actors, capabilities and snapshots must come from
 * trusted server/database checks. No route currently invokes this package.
 */
export type Capability = "draft.create" | "draft.edit.own" | "draft.edit.any" | "draft.submit" | "article.review" | "article.approve" | "article.publish" | "article.unpublish";
export type Actor = { id: string; active: boolean; capabilities: readonly Capability[] };
export type Content = { title: string; summary: string; body: string };
export type Version = { id: string; authorId: string; content: Content; state: "draft" | "review" | "approved" };
export type Article = { id: string; ownerId: string; revision: number; currentVersionId: string; publishedVersionId: string | null; versions: readonly Version[] };
export type AuditEvent = { articleId: string; versionId: string; actorId: string; action: "create" | "edit" | "submit" | "request_revision" | "approve" | "publish" | "unpublish"; revision: number };
export type Outcome = { ok: true; article: Article; audit: AuditEvent } | { ok: false; error: "invalid" | "denied" | "conflict" };
export type Command =
  | { action: "edit"; expectedRevision: number; versionId: string; content: Content }
  | { action: "submit" | "request_revision" | "approve" | "publish" | "unpublish"; expectedRevision: number };

const identifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function validContent(value: Content): boolean {
  return !!value && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 200 &&
    typeof value.summary === "string" && value.summary.length <= 1000 && typeof value.body === "string" && value.body.trim().length > 0 && value.body.length <= 100000;
}
function permitted(actor: Actor, capability: Capability): boolean {
  return !!actor && actor.active === true && identifier(actor.id) && Array.isArray(actor.capabilities) && actor.capabilities.includes(capability);
}
function canEdit(actor: Actor, article: Article): boolean {
  return permitted(actor, "draft.edit.any") || (actor.id === article.ownerId && permitted(actor, "draft.edit.own"));
}
function validArticle(article: Article): boolean {
  if (!article || !identifier(article.id) || !identifier(article.ownerId) || !Number.isSafeInteger(article.revision) || article.revision < 1 ||
      !identifier(article.currentVersionId) || !Array.isArray(article.versions) || article.versions.length === 0) return false;
  const ids = new Set<string>();
  for (const v of article.versions) {
    if (!v || !identifier(v.id) || !identifier(v.authorId) || !validContent(v.content) ||
        !["draft", "review", "approved"].includes(v.state) || ids.has(v.id)) return false;
    ids.add(v.id);
  }
  if (!ids.has(article.currentVersionId)) return false;
  if (article.publishedVersionId !== null && (!identifier(article.publishedVersionId) || !article.versions.some(v => v.id === article.publishedVersionId && v.state === "approved"))) return false;
  return true;
}
function finish(article: Article, actor: Actor, action: AuditEvent["action"], versionId: string): Outcome {
  const copied = { ...article, versions: article.versions.map(v => ({ ...v, content: { ...v.content } })) };
  return { ok: true, article: copied, audit: { articleId: article.id, versionId, actorId: actor.id, action, revision: article.revision } };
}

/** Create a private draft. IDs are provided by a trusted server and must be unique in persistent storage. */
export function createDraft(actor: Actor, id: string, versionId: string, content: Content): Outcome {
  if (!permitted(actor, "draft.create")) return { ok: false, error: "denied" };
  if (!identifier(id) || !identifier(versionId) || !validContent(content)) return { ok: false, error: "invalid" };
  const version: Version = { id: versionId, authorId: actor.id, content: { title: content.title, summary: content.summary, body: content.body }, state: "draft" };
  return finish({ id, ownerId: actor.id, revision: 1, currentVersionId: versionId, publishedVersionId: null, versions: [version] }, actor, "create", versionId);
}

/**
 * Pure state transition. The returned article AND audit event must be committed
 * atomically with a database compare-and-swap on expectedRevision. Tests here
 * cannot prove isolation, RLS, authorisation or durable audit. Independent
 * approval is a conservative provisional default pending the owner's policy.
 */
export function transition(article: Article, actor: Actor, command: Command): Outcome {
  if (!validArticle(article) || !command || !Number.isSafeInteger(command.expectedRevision)) return { ok: false, error: "invalid" };
  if (command.expectedRevision !== article.revision) return { ok: false, error: "conflict" };
  if (article.revision === Number.MAX_SAFE_INTEGER) return { ok: false, error: "invalid" };
  if (!actor || actor.active !== true || !identifier(actor.id)) return { ok: false, error: "denied" };
  const current = article.versions.find(v => v.id === article.currentVersionId)!;
  if (command.action === "edit") {
    if (!canEdit(actor, article)) return { ok: false, error: "denied" };
    if (current.state === "review" || !identifier(command.versionId) || article.versions.some(v => v.id === command.versionId) || !validContent(command.content)) return { ok: false, error: "invalid" };
    const version: Version = { id: command.versionId, authorId: actor.id, content: { title: command.content.title, summary: command.content.summary, body: command.content.body }, state: "draft" };
    return finish({ ...article, revision: article.revision + 1, currentVersionId: version.id, versions: [...article.versions, version] }, actor, "edit", version.id);
  }
  if (command.action === "submit") {
    if (!permitted(actor, "draft.submit") || !canEdit(actor, article)) return { ok: false, error: "denied" };
    if (current.state !== "draft") return { ok: false, error: "invalid" };
    return finish({ ...article, revision: article.revision + 1, versions: article.versions.map(v => v.id === current.id ? { ...v, state: "review" } : v) }, actor, "submit", current.id);
  }
  if (command.action === "request_revision") {
    if (!permitted(actor, "article.review")) return { ok: false, error: "denied" };
    if (current.state !== "review") return { ok: false, error: "invalid" };
    return finish({ ...article, revision: article.revision + 1, versions: article.versions.map(v => v.id === current.id ? { ...v, state: "draft" } : v) }, actor, "request_revision", current.id);
  }
  if (command.action === "approve") {
    if (!permitted(actor, "article.approve") || current.authorId === actor.id || article.ownerId === actor.id) return { ok: false, error: "denied" };
    if (current.state !== "review") return { ok: false, error: "invalid" };
    return finish({ ...article, revision: article.revision + 1, versions: article.versions.map(v => v.id === current.id ? { ...v, state: "approved" } : v) }, actor, "approve", current.id);
  }
  if (command.action === "publish") {
    if (!permitted(actor, "article.publish")) return { ok: false, error: "denied" };
    if (current.state !== "approved" || article.publishedVersionId === current.id) return { ok: false, error: "invalid" };
    return finish({ ...article, revision: article.revision + 1, publishedVersionId: current.id }, actor, "publish", current.id);
  }
  if (command.action === "unpublish") {
    if (!permitted(actor, "article.unpublish")) return { ok: false, error: "denied" };
    if (!article.publishedVersionId) return { ok: false, error: "invalid" };
    return finish({ ...article, revision: article.revision + 1, publishedVersionId: null }, actor, "unpublish", article.publishedVersionId);
  }
  return { ok: false, error: "invalid" };
}

/** Allowlisted public fields only. No draft, private IDs, history, actor or audit information. */
export function publishedContent(article: Article): Content | null {
  if (!validArticle(article) || !article.publishedVersionId) return null;
  const version = article.versions.find(v => v.id === article.publishedVersionId && v.state === "approved");
  return version ? { title: version.content.title, summary: version.content.summary, body: version.content.body } : null;
}

/**
 * A trusted backend adapter must implement one atomic database transaction:
 * compare persisted revision, write the complete new article and append the audit
 * event together, or write nothing. loadArticle must read authoritative current
 * state; it must never return a stale shared-cache copy. This is a contract only:
 * no production repository or transaction is implemented by this package.
 */
export interface EditorialRepository {
  loadArticle(id: string): Promise<Article | null>;
  compareAndCommit(id: string, expectedRevision: number, next: Article, audit: AuditEvent): Promise<"committed" | "conflict">;
}
export type ServiceOutcome = { ok: true; revision: number } | { ok: false; error: "invalid" | "denied" | "conflict" | "not_found" | "unavailable" };

/** Actor and capabilities must be verified by the server/data boundary, never from request input. */
export async function executeEditorialCommand(repository: EditorialRepository, id: string, actor: Actor, command: Command): Promise<ServiceOutcome> {
  if (!identifier(id)) return { ok: false, error: "invalid" };
  try {
    const article = await repository.loadArticle(id);
    if (!article) return { ok: false, error: "not_found" };
    if (article.id !== id) return { ok: false, error: "unavailable" };
    const result = transition(article, actor, command);
    if (!result.ok) return result;
    const saved = await repository.compareAndCommit(id, command.expectedRevision, result.article, result.audit);
    if (saved === "conflict") return { ok: false, error: "conflict" };
    if (saved !== "committed") return { ok: false, error: "unavailable" };
    return { ok: true, revision: result.article.revision };
  } catch {
    // A commit may have succeeded before a network failure; callers must reload
    // authoritative state before retrying rather than assuming it did not.
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Read through the repository every time. Public routes must also disable shared
 * page/CDN caching (or implement verified invalidation) and never expose private
 * repository objects. This alone does not guarantee global cache withdrawal.
 */
export async function readPublishedArticle(repository: EditorialRepository, id: string): Promise<{ ok: true; content: Content } | { ok: false; error: "not_found" | "unavailable" }> {
  if (!identifier(id)) return { ok: false, error: "not_found" };
  try {
    const article = await repository.loadArticle(id);
    if (!article) return { ok: false, error: "not_found" };
    if (article.id !== id) return { ok: false, error: "unavailable" };
    const content = publishedContent(article);
    return content ? { ok: true, content } : { ok: false, error: "not_found" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
