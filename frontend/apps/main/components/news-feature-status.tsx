export function NewsFeatureStatus() {
  return (
    <aside
      aria-label="News features coming soon"
      className="mt-6 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">More ways to follow the news</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-[color:var(--color-brand-red-deep)]">
          Coming Soon
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <li><span className="font-medium text-foreground">Offline article reading</span> — Coming Soon</li>
        <li><span className="font-medium text-foreground">Opt-in push notifications</span> — Coming Soon</li>
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        These features are not active yet. We will only request notification permission when delivery is ready.
      </p>
    </aside>
  );
}
