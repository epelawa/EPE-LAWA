export type SkeletonShape = "title" | "line" | "line-short" | "media";

/**
 * Loading placeholder. It must match the shape of the content that is coming, so a list
 * gets lines and an image gets a media block. The container is responsible for `aria-busy`
 * and for an announced loading label.
 */
export function Skeleton({ shape = "line" }: { shape?: SkeletonShape }) {
  return <span className={`ep-skeleton ep-skeleton--${shape}`} aria-hidden="true" />;
}
