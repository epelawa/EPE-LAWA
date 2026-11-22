import type { ReactNode } from "react";
import { PageFrame, PageIntro, Panel, StatusBadge, SectionHeading } from "@epelawa/ui";
import { DatabaseIcon, InboxIcon, WrenchIcon, ImageIcon, ShieldIcon, ChartIcon, BoltIcon, ClockIcon } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { systemReadiness } from "../../../lib/system-status";
import { setMaintenance } from "./maintenance-actions";
import BusySubmit from "../../../components/busy-submit";
import styles from "./settings.module.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const stateLabel: Record<string, string> = {
  ready: "Ready",
  incomplete: "Needs setup",
  optional: "Optional",
  off: "Off",
};

const stateTone: Record<string, "success" | "warning" | "neutral"> = {
  ready: "success",
  incomplete: "warning",
  optional: "neutral",
  off: "neutral",
};

const shortcuts = [
  { label: "Backups", hint: "Snapshots and restore", href: "/backups" },
  { label: "Gallery & media", hint: "Photos and uploads", href: "/media" },
  { label: "Roles", hint: "Capabilities per role", href: "/roles" },
  { label: "Analytics", hint: "Reads and clicks", href: "/analytics" },
  { label: "Enquiries", hint: "Private inbox", href: "/enquiries" },
];

const iconFor: Record<string, ReactNode> = {
  "Database backups": <DatabaseIcon size={22} />,
  "Backup automation": <BoltIcon size={22} />,
  "Newsletter sending": <InboxIcon size={22} />,
  "Web push": <ChartIcon size={22} />,
  "Public media": <ImageIcon size={22} />,
};

const shortcutIcon: Record<string, ReactNode> = {
  Backups: <DatabaseIcon size={22} />,
  "Gallery & media": <ImageIcon size={22} />,
  Roles: <ShieldIcon size={22} />,
  Analytics: <ChartIcon size={22} />,
  Enquiries: <InboxIcon size={22} />,
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{maintenance?: string}> }) {
  const params = await searchParams;
  const db = await createStaffClient();
  let authorized = false;
  { const { data, error } = await db.rpc("staff_roles_authorized"); authorized = !error && data === true; }
  if (!authorized) return <PageFrame><PageIntro eyebrow="Administration" title="Settings" description="Maintenance control and workspace status are restricted to the primary administrator, or authorization could not be verified." /></PageFrame>;

  let maintenance: {enabled:boolean; revision:number} | null = null;
  if (process.env.MAINTENANCE_GATE_ENABLED === "false") {
    maintenance = null;
  } else {
    { const {data,error} = await db.rpc("maintenance_admin_status"); if (!error && Array.isArray(data) && typeof data[0]?.enabled === "boolean" && Number.isSafeInteger(data[0]?.revision)) maintenance = data[0]; }
  }
  const tiles = systemReadiness(process.env);
  const readyCount = tiles.filter(tile => tile.state === "ready").length;

  return <PageFrame className={styles.page}>
    <PageIntro
      eyebrow="Administration"
      title="Settings"
      description="Maintenance control, workspace status and shortcuts. Status shows presence only; values are never displayed here."
      meta={<>
        <span>{readyCount} of {tiles.length} systems ready</span>
      </>}
    />

    <Panel className={styles.pause} data-on={maintenance?.enabled ? "true" : "false"}>
      <div className={styles.pauseArt} aria-hidden="true"><WrenchIcon size={30} /></div>
      <div className={styles.pauseBody}>
        <h2>Website maintenance</h2>
        <p>Pause the public website while improvements are underway. Staff workspaces stay reachable.</p>
        <p className="ui-muted" aria-live="polite">
          Current status: <strong>{maintenance ? (maintenance.enabled ? "On" : "Off") : "Unavailable"}</strong>
        </p>
        {params.maintenance === "saved" && <p role="status" className={styles.note}>Maintenance setting updated.</p>}
        {(params.maintenance === "failed" || params.maintenance === "unavailable") && <p role="alert" className={styles.note}>The setting could not be updated. Refresh the page and try again.</p>}
      </div>
      <div className={styles.pauseAction}>
        {maintenance ? (
          <form action={setMaintenance}>
            <input type="hidden" name="enabled" value={String(!maintenance.enabled)} />
            <input type="hidden" name="revision" value={maintenance.revision} />
            <BusySubmit
              className="btn-primary"
              pendingLabel={maintenance.enabled ? "Turning off…" : "Turning on…"}
            >
              {maintenance.enabled ? "Turn maintenance off" : "Turn maintenance on"}
            </BusySubmit>
          </form>
        ) : (
          <p className={styles.unavailableNote}>Complete the database and deployment setup before using this setting.</p>
        )}
      </div>
    </Panel>

    <section className={styles.readiness} aria-labelledby="readiness-heading">
      <SectionHeading
        id="readiness-heading"
        eyebrow="System status"
        title="What is switched on"
        description="Presence of the server variables each feature needs. Presence is not verification; open the linked desk to see real behavior."
      />
      <ul className={styles.tiles}>
        {tiles.map(tile => (
          <li key={tile.label} className={styles.tile} data-state={tile.state}>
            <div className={styles.tileHead}>
              <span className={styles.tileIcon} aria-hidden="true">{iconFor[tile.label]}</span>
              <StatusBadge tone={stateTone[tile.state]}>{stateLabel[tile.state]}</StatusBadge>
            </div>
            <h3>{tile.label}</h3>
            <p>{tile.description}</p>
            {tile.missing.length > 0 ? (
              <p className={styles.missing} title="Set these sensitive variables in Vercel">
                <ClockIcon size={14} /> Missing: {tile.missing.join(", ")}
              </p>
            ) : null}
            {tile.href && tile.href !== "/" ? <a className={styles.tileLink} href={tile.href}>Open desk</a> : null}
          </li>
        ))}
      </ul>
    </section>

    <Panel className={styles.shortcutsPanel}>
      <SectionHeading eyebrow="Workspace" title="Jump to a desk" description="Frequent destinations for day-to-day operations." />
      <ul className={styles.shortcuts}>
        {shortcuts.map(shortcut => (
          <li key={shortcut.href}>
            <a className={styles.shortcut} href={shortcut.href}>
              <span className={styles.shortcutIcon} aria-hidden="true">{shortcutIcon[shortcut.label]}</span>
              <span className={styles.shortcutBody}>
                <strong>{shortcut.label}</strong>
                <span>{shortcut.hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  </PageFrame>;
}
