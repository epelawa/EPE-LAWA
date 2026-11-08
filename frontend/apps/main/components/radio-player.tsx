import { RadioIcon } from "./icons";
import { Panel, SectionHeading, StatusBadge } from "./design-system";

export default function RadioPlayer() {
  return (
    <Panel className="ui-subtle" aria-labelledby="radio-player-title">
      <div className="ui-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="ui-stack-sm">
          <SectionHeading eyebrow="Listen live" title={<span id="radio-player-title">EPE LAWA Radio</span>} />
          <p className="ui-muted" role="status">
            Live streaming is not yet available. The official stream URL, embedding permission, compatible format and playback have not yet been verified.
          </p>
        </div>
        <StatusBadge tone="warning"><span role="status" aria-label="Live streaming status: Coming Soon"><RadioIcon size={14} aria-hidden="true" />Coming Soon</span></StatusBadge>
      </div>
    </Panel>
  );
}
