import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
        EPE LAWA · 404
      </p>
      <h1 className="text-2xl font-bold tracking-tight mb-4">Page not found</h1>
      <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
        We couldn't find that page. It may have moved, or the address may be
        mistyped. Only the pages linked in the header and footer exist today.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/" className="btn-primary flex-1 sm:auto">
          Try again
        </a>
        <Link href="/" className="btn-ghost flex-1 sm:auto">
          Return to the homepage
        </Link>
      </div>
    </div>
  );
}
