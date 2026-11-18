import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { configurationStatus } from "../../../lib/configuration-inventory";
import { CopyConfigName } from "../../../components/copy-config-name";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function SettingsPage() {
  let authorized = false;
  try { const db = await createClient(); const { data, error } = await db.rpc("staff_roles_authorized"); authorized = !error && data === true; } catch { /* fail closed */ }
  if (!authorized) return <PageFrame><PageIntro eyebrow="Administration" title="Settings" description="Configuration status is restricted to the primary administrator, or authorization could not be verified." /></PageFrame>;
  const items = configurationStatus(process.env);
  const groups = [...new Set(items.map(item => item.group))];
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Administration" title="Deployment settings" description="Presence only; values and provider status are not verified." />

    {groups.map(group => <Panel key={group} className="ui-stack"><h2>{group}</h2>{items.filter(item => item.group === group).map(item => <section key={item.name} className="ui-stack-sm" style={{ borderTop: "1px solid var(--border, #a6b2c5)", paddingTop: "1rem", overflowWrap: "anywhere" }}>
      <div className="ui-row"><strong><code>{item.name}</code></strong><span>{item.status === "present" ? "Present (not verified)" : item.status === "sample" ? "Sample — replace" : item.optional ? "Not set (optional)" : "Not set"}</span></div>
      <CopyConfigName name={item.name} />
    </section>)}</Panel>)}
  </PageFrame>;
}
