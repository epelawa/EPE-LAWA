import { TidegateSpinner } from "../components/site-motion";

export default function Loading() {
  return (
    <div className="ui-page ui-loading" aria-busy="true">
      <div className="ui-page-intro">
        <div className="ui-loading__message">
          <TidegateSpinner label="Loading the page" />
          <div>
            <p className="ui-eyebrow">One moment</p>
            <h1>Finding your page.</h1>
            <p className="ui-muted">Loading the latest available information</p>
          </div>
        </div>
      </div>
      <div className="ui-grid ui-grid--2" aria-hidden="true">
        <div className="ui-panel ui-subtle" style={{ minHeight: 180 }} />
        <div className="ui-panel" style={{ minHeight: 180 }} />
      </div>
    </div>
  );
}
