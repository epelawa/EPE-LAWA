import { Panel, StatusBadge } from "./design-system";

export function NewsFeatureStatus() {
  return <Panel className="ui-subtle" aria-label="News features coming soon">
    <div className="ui-row"><h2 className="text-lg font-semibold">More ways to follow the news</h2><StatusBadge tone="neutral">Coming Soon</StatusBadge></div>
    <ul className="ui-row ui-meta mt-3">
      <li><span className="font-medium text-foreground">Offline article reading</span> — Coming Soon</li>
      <li><span className="font-medium text-foreground">Opt-in push notifications</span> — Coming Soon</li>
    </ul>
    <p className="ui-muted mt-3">These features are not active yet. We will only request notification permission when delivery is ready.</p>
  </Panel>;
}
