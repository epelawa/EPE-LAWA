import { Panel, StatusBadge } from "./design-system";

export function NewsFeatureStatus() {
  return <Panel className="ui-subtle" aria-label="News reading and notification availability">
    <div className="ui-stack-sm">
      <div className="ui-row">
        <h2 className="text-lg font-semibold">Read a story offline</h2>
        <StatusBadge tone="neutral">Available on article pages</StatusBadge>
      </div>
      <p className="ui-muted">Each published story can be downloaded as a self-contained, text-only HTML file. The copy stays on your device and does not include images or later updates.</p>
      <p className="ui-muted"><strong>Push notifications are unavailable.</strong> A verified delivery provider is not configured, so EPE LAWA will not request notification permission.</p>
    </div>
  </Panel>;
}
