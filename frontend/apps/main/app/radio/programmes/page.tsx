import type { IcsSlot } from "./ics";
import type { Metadata } from "next";
import Link from "next/link";
import { RadioIcon } from "../../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "../../../components/design-system";
import { onAirSlotId } from "./on-air";
import styles from "../radio-page.module.css";
import { PUBLIC_SCHEDULE_COLUMNS, publicScheduleSlot } from "../../../lib/radio-schedule";
import { createClient } from "../../../lib/supabase";
import { pageMetadata } from "../../../lib/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "Radio programmes", description: "Approved EPE LAWA programmes and the weekly schedule, in West Africa Time.", path: "/radio/programmes" });

export default async function RadioProgrammesPage() {
  let onAirId: string | null = null;
  let programmes: Array<{ id: string; name: string; description: string | null }> = [];
  let slots: IcsSlot[] = [];
  let unavailable = false;
  try {
    const db = await createClient();
    const [p, s] = await Promise.all([
      db.from("programmes").select("id,name,description").eq("is_active", true).eq("publication_status", "published").order("name").limit(100),
      db.from("radio_schedule").select(PUBLIC_SCHEDULE_COLUMNS).eq("publication_status", "published").eq("programmes.publication_status", "published").eq("programmes.is_active", true).order("day_of_week").order("starts_at").limit(200),
    ]);
    if (p.error || s.error) unavailable = true;
    else { programmes = p.data ?? []; slots = (s.data ?? []).map(publicScheduleSlot); onAirId = onAirSlotId(slots); }
  } catch { unavailable = true; }

  return (
    <PageFrame className={`ui-stack ${styles.page}`}>
      <PageIntro
        eyebrow="EPE LAWA RADIO"
        title="Programmes and schedule"
        description="Published EPE LAWA programmes and weekly listings. All times are West Africa Time (WAT)."
      />
      <Link href="/radio" className="ui-text-link">← Back to live radio</Link>
      {unavailable ? (
        <EmptyPanel
          title="Programme information is unavailable"
          description="Try again later."
          icon={<RadioIcon size={22} />}
        />
      ) : (
        <div className="ui-stack">
          <Panel>
            <SectionHeading eyebrow="On air and in the community" title="Programmes" />
            {programmes.length ? (
              <ul className="ui-list ui-stack-sm">
                {programmes.map((programme) => (
                  <li className="ui-item" key={programme.id}>
                    <h3 className="ui-item-title">{programme.name}</h3>
                    {programme.description ? <p className="ui-muted">{programme.description}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel title="No programmes published yet" description="Approved programme information will appear here when it is available." />
            )}
          </Panel>

          <Panel>
            <SectionHeading eyebrow="Weekly listings" title="Schedule" action={<a className="btn-secondary" href="/api/radio/schedule.ics">Add to calendar (.ics)</a>} />
            {slots.length ? (
              <ul className="ui-list">
                {slots.map((slot) => (
                  <li className="ui-item ui-row" key={slot.id}>
                    <span className="ui-number">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][slot.day_of_week]}</span>
                    <div className="ui-stack-sm">
                      <h3 className="ui-item-title">{slot.programme ?? "EPE LAWA programme"}</h3>
                      <p className="ui-meta"><span>{slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}</span>{slot.note ? <span>{slot.note}</span> : null}{slot.id === onAirId ? <StatusBadge tone="success">On air now</StatusBadge> : null}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel title="No schedule published yet" description="The programme schedule is being updated. Published programme times will appear here." />
            )}
          </Panel>

        </div>
      )}
    </PageFrame>
  );
}
