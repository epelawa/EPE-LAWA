import Link from "next/link";

/**
 * Route-level loading fallback. Next skips prefetching on a slow connection, so this really
 * does render on a 2G or 3G phone — which is the connection this product is designed for.
 * The shape matches a page: a title, a paragraph and a closing line.
 */
export default function Loading() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading this page</span>
        <div className="h-4 bg-slate-200 rounded-lg w-3/4 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded-lg w-1/2 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
      </div>
    </div>
  );
}
