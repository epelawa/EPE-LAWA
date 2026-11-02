import { Container, Skeleton } from "@epelawa/ui";

/**
 * Route-level loading fallback. Next skips prefetching on a slow connection, so this really
 * does render on a 2G or 3G phone — which is the connection this product is designed for.
 * The shape matches a page: a title, a paragraph and a closing line.
 */
export default function Loading() {
  return (
    <Container>
      <div className="page-loading" aria-busy="true">
        <span className="ep-sr-only">Loading this page</span>
        <Skeleton shape="title" />
        <Skeleton shape="line" />
        <Skeleton shape="line-short" />
      </div>
    </Container>
  );
}
