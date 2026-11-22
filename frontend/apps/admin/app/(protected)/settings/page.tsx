import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { configurationStatus } from "../../../lib/configuration-inventory";
import { setMaintenance } from "./maintenance-actions";
import { CopyConfigName } from "../../../components/copy-config-name";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{maintenance?: string}> }) {
  const params = await searchParams;
  const db = await createStaffClient();
  let authorized = false;
  { const { data, error } = await db.rpc("staff_roles_authorized"); authorized = !error && data === true; }
  if (!authorized) return <PageFrame><PageIntro eyebrow="Administration" title="Settings" description="Configuration status is restricted to the primary administrator, or authorization could not be verified." /></PageFrame>;
  let maintenance: {enabled:boolean; revision:number} | null = null;
  if (process.env.MAINTENANCE_GATE_ENABLED === "true") {
    { const {data,error} = await db.rpc("maintenance_admin_status"); if (!error && Array.isArray(data) && typeof data[0]?.enabled === "boolean" && Number.isSafeInteger(data[0]?.revision)) maintenance = data[0]; }
  }
  const items = configurationStatus(process.env);
  const groups = [...new Set(items.map(item => item.group))];
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Administration" title="Deployment settings" description="Presence only; values and provider status are not verified." />

    <Panel className="ui-stack"><h2>Website maintenance</h2><p>Temporarily pause the public website while improvements are underway.</p>
      {params.maintenance === "saved" && <p role="status">Maintenance setting updated.</p>}
      {(params.maintenance === "failed" || params.maintenance === "unavailable") && <p role="alert">The setting could not be updated. Refresh the page and try again.</p>}
      {maintenance ? <><p>Current status: <strong>{maintenance.enabled ? "On" : "Off"}</strong></p><form action={setMaintenance}><input type="hidden" name="enabled" value={String(!maintenance.enabled)} /><input type="hidden" name="revision" value={maintenance.revision} /><button className="ui-button ui-button--primary" type="submit">{maintenance.enabled ? "Turn maintenance off" : "Turn maintenance on"}</button></form></> : <p role="status">Maintenance controls are unavailable. Complete the database and deployment setup before using this setting.</p>}
    </Panel>
    {groups.map(group => <Panel key={group} className="ui-stack"><h2>{group}</h2>{items.filter(item => item.group === group).map(item => <section key={item.name} className="ui-stack-sm" style={{ borderTop: "1px solid var(--border, #a6b2c5)", paddingTop: "1rem", overflowWrap: "anywhere" }}>
      <div className="ui-row"><strong><code>{item.name}</code></strong><span>{item.status === "present" ? "Present (not verified)" : item.status === "sample" ? "Sample — replace" : item.optional ? "Not set (optional)" : "Not set"}</span></div>
      <CopyConfigName name={item.name} />
    </section>)}</Panel>)}
  </PageFrame>;
}
