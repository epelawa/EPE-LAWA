/**
 * Route-level loading fallback. Next skips prefetching on a slow connection, so this really
 * does render on a 2G or 3G phone — which is the connection this product is designed for.
 * The shape matches a page: a title, a paragraph and a closing line.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading this page</span>
        <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
