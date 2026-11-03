import Link from "next/link";
import { footerNavigation } from "../lib/navigation";

export default function SiteFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-2">
            <img
              src="/brand-logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
              decoding="async"
            />
            <div>
              <span className="font-bold text-slate-900">EPE LAWA</span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Epe Division</span>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-6 text-sm">
              {footerNavigation.map((item) => (
                <li key={item.href}>
                  <Link className="text-slate-600 hover:text-blue-600 transition-colors" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} EPE LAWA. Epe Division, Lagos State.
        </p>
      </div>
    </footer>
  );
}
