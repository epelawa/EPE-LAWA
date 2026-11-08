import { PageFrame, Panel } from "@epelawa/ui";
import { TidegateSpinner } from "../../components/site-motion";

export default function Loading() {
  return (
    <PageFrame aria-busy="true">
      <Panel className="admin-loading__message">
        <TidegateSpinner label="Loading the staff workspace" />
        <p>Loading workspace</p>
      </Panel>
    </PageFrame>
  );
}
