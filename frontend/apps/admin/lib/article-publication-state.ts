export type ArticlePublicationPointers = {
  currentVersionId: string | null;
  publishedVersionId: string | null;
};

export type ArticlePublicationState = {
  hasPublishedVersion: boolean;
  currentVersionIsPublic: boolean;
  olderVersionRemainsPublic: boolean;
};

export function articlePublicationState({
  currentVersionId,
  publishedVersionId,
}: ArticlePublicationPointers): ArticlePublicationState {
  const hasPublishedVersion = typeof publishedVersionId === "string" && publishedVersionId.length > 0;
  const currentVersionIsPublic = hasPublishedVersion && currentVersionId !== null && publishedVersionId === currentVersionId;
  return {
    hasPublishedVersion,
    currentVersionIsPublic,
    olderVersionRemainsPublic: hasPublishedVersion && !currentVersionIsPublic,
  };
}

export function hasConfirmedArticleUnpublish(value: unknown): boolean {
  return value === "yes";
}
