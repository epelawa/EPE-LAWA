import Link from "next/link";

/**
 * Gallery page.
 *
 * A place for photographs from across Epe Division. Nothing is published yet, so this
 * renders an honest empty state rather than invented imagery. Real photographs are licensed
 * and credited before they appear — never stock passed off as Epe.
 */
export default function GalleryPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Gallery
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="text-slate-600 mt-2 max-w-sm leading-relaxed">
          Photographs from across Epe Division. Nothing appears here until it has been
          licensed, sourced and credited.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
          <span className="text-slate-400 text-sm">🖼️</span>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">
          No photographs have been published yet.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-600 text-sm leading-relaxed">
          Every photograph in this gallery will carry a credit and a source. Until EPE LAWA
          has licensed imagery of Epe Division, this page stays empty — a stock image of a
          generic waterfront presented as Epe would be a lie told in pixels.
        </p>
      </div>
    </div>
  );
}
