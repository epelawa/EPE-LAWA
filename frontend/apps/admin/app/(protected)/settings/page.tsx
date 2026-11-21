import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { setMaintenance } from "./maintenance-actions";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{maintenance?: string}> }) {
  const params = await searchParams;
  let authorized = false;
  try { const db = await createClient(); const { data, error } = await db.rpc("staff_roles_authorized"); authorized = !error && data === true; } catch { /* fail closed */ }
  if (!authorized) return <PageFrame><PageIntro eyebrow="Administration" title="Settings" description="Website maintenance is restricted to the primary administrator, or authorization could not be verified." /></PageFrame>;
  let maintenance: {enabled:boolean; revision:number} | null = null;
  try { const db = await createClient(); const {data,error} = await db.rpc("maintenance_admin_status"); if (!error && Array.isArray(data) && typeof data[0]?.enabled === "boolean" && Number.isSafeInteger(data[0]?.revision)) maintenance = data[0]; } catch { /* unavailable, do not guess */ }
  const gateLive = process.env.MAINTENANCE_GATE_ENABLED === "true";
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Administration" title="Settings" description="Pause or resume the public website." />
    <Panel className="ui-stack"><h2>Website maintenance</h2><p>Temporarily pause the public website while improvements are underway.</p>
      {params.maintenance === "saved" && <p role="status">Maintenance setting updated.</p>}
      {(params.maintenance === "failed" || params.maintenance === "unavailable") && <p role="alert">The setting could not be updated. Refresh the page and try again.</p>}
      {maintenance && !gateLive && maintenance.enabled ? <p role="warning">The switch is set to On. The public website actually pauses once <code>MAINTENANCE_GATE_ENABLED</code> is set to <code>true</code> in Vercel.</p> : null}
      {maintenance && !gateLive && !maintenance.enabled ? <p className="ui-muted">The switch is ready. Until <code>MAINTENANCE_GATE_ENABLED</code> is set to <code>true</code> in Vercel, turning it on saves the choice but does not pause the public website yet.</p> : null}
      {maintenance
        ? <><p>Current status: <strong>{maintenance.enabled ? "On" : "Off"}</strong></p><form action={setMaintenance}><input type="hidden" name="enabled" value={String(!maintenance.enabled)} /><input type="hidden" name="revision" value={maintenance.revision} /><button className="ui-button ui-button--primary" type="submit">{maintenance.enabled ? "Turn maintenance off" : "Turn maintenance on"}</button></form></>
        : <p role="status">Maintenance controls are unavailable because the database did not answer just now. Refresh the page and try again.</p>}
    </Panel>
  </PageFrame>;
}
