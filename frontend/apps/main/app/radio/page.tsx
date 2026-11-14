import type { Metadata } from "next";
import RadioPlayer from "../../components/radio-player";
import { RadioIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading } from "../../components/design-system";
import { createClient } from "../../lib/supabase";
import { pageMetadata } from "../../lib/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Radio Lagos 107.5 FM and approved EPE LAWA programmes, schedules and archive episodes.", path: "/radio" });

export default async function RadioPage() {
  let programmes: Array<{ id: string; name: string; description: string | null }> = [];
  let slots: Array<{ id: string; day_of_week: number; starts_at: string; ends_at: string; note: string | null; programmes: Array<{ name: string }> }> = [];
  let episodes: Array<{ id: string; title: string; description: string | null; aired_on: string | null; external_url: string | null; programmes: Array<{ name: string }> }> = [];
  let unavailable = false;
  try {
    const db = await createClient();
    const [p, s, e] = await Promise.all([
      db.from("programmes").select("id,name,description").eq("is_active", true).order("name").limit(100),
      db.from("radio_schedule").select("id,day_of_week,starts_at,ends_at,note,programmes(name)").order("day_of_week").order("starts_at").limit(200),
      db.from("episodes").select("id,title,description,aired_on,external_url,programmes(name)").not("published_at", "is", null).order("published_at", { ascending: false }).limit(50),
    ]);
    if (p.error || s.error || e.error) unavailable = true;
    else { programmes = p.data ?? []; slots = s.data ?? []; episodes = e.data ?? []; }
  } catch { unavailable = true; }

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Radio Lagos · 107.5 FM"
        title="EPE LAWA Radio"
        description="Listen to the external Radio Lagos 107.5 FM stream. Approved EPE LAWA programmes, schedules and archive episodes appear below."
      />
      <RadioPlayer />
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
            <SectionHeading eyebrow="Weekly listings" title="Schedule" />
            {slots.length ? (
              <ul className="ui-list">
                {slots.map((slot) => (
                  <li className="ui-item ui-row" key={slot.id}>
                    <span className="ui-number">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][slot.day_of_week]}</span>
                    <div className="ui-stack-sm">
                      <h3 className="ui-item-title">{slot.programmes[0]?.name}</h3>
                      <p className="ui-meta"><span>{slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}</span>{slot.note ? <span>{slot.note}</span> : null}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel title="No schedule published yet" description="There are no programme times to show at the moment." />
            )}
          </Panel>

          <Panel>
            <SectionHeading eyebrow="Listen again" title="Archive" description="Published episodes from the EPE LAWA Radio community." />
            {episodes.length ? (
              <ul className="ui-list">
                {episodes.map((episode) => (
                  <li className="ui-item ui-stack-sm" key={episode.id}>
                    <h3 className="ui-item-title">{episode.title}</h3>
                    <p className="ui-meta"><span>{episode.programmes[0]?.name}</span>{episode.aired_on ? <span>{episode.aired_on}</span> : null}</p>
                    {episode.description ? <p className="ui-muted">{episode.description}</p> : null}
                    {episode.external_url ? <audio className="mt-2 w-full" controls preload="none" src={episode.external_url}>Audio playback is not supported by this browser.</audio> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel title="No published episodes available" description="When archive episodes are published, you will be able to find them here." />
            )}
          </Panel>
        </div>
      )}
    </PageFrame>
  );
}
