import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 lg:px-8">
      <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        EPE LAWA · 404
      </p>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mx-auto mb-8 max-w-sm leading-relaxed text-muted-foreground">
        The address you followed does not match a page on this site. It may have
        moved, or the link may be mistyped.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn-primary flex-1 sm:flex-none">
          Back to the homepage
        </Link>
        <Link href="/news" className="btn-ghost flex-1 sm:flex-none">
          Read the news
        </Link>
      </div>
    </div>
  );
}
