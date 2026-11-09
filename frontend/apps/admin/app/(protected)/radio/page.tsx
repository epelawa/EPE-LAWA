import { createClient } from "../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { saveEpisode, saveProgramme, saveSchedule } from "./actions";
export const dynamic = "force-dynamic";
const field = "ui-field";
const input = "input";
const statuses = ["draft", "published", "withdrawn"];
const button = "btn-primary";
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export default async function RadioAdminPage({ searchParams }: { searchParams: Promise<{ radio?: string }> }) {
  const params = await searchParams;
  const messages: Record<string, { role: "status" | "alert"; text: string }> = {
    saved: { role: "status", text: "Radio record saved." },
    conflict: { role: "alert", text: "This Radio record changed since it was loaded. Reload the page and review the latest version before saving." },
    denied: { role: "alert", text: "You are not authorized to manage Radio records." },
    invalid: { role: "alert", text: "Check the form fields. Publishing requires a fresh private rights/source note." },
    save: { role: "alert", text: "Radio record could not be saved. Please try again." },
  };
  const message = params.radio ? messages[params.radio] : null;
  const db = await createClient();
  const { data: allowed, error: capabilityError } = await db.rpc("has_capability", { p_capability: "radio.manage" });
  if (capabilityError || allowed !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Radio authoring" description="Manage approved radio programming."/><Notice tone="danger" role="alert">The radio.manage capability is required. No records are shown.</Notice></PageFrame>;
  const [
    { data: programmes, error: programmesError },
    { data: episodes, error: episodesError },
    { data: schedules, error: schedulesError },
  ] = await Promise.all([
    db.from("programmes").select("id,name,description,publication_status,revision").order("updated_at", { ascending: false }).limit(100),
    db.from("episodes").select("id,programme_id,title,slug,description,aired_on,external_url,publication_status,published_at,revision").order("updated_at", { ascending: false }).limit(100),
    db.from("radio_schedule").select("id,programme_id,day_of_week,starts_at,ends_at,note,publication_status,revision").order("day_of_week").order("starts_at").limit(200),
  ]);
  const error = programmesError;
  const failedSections = [
    programmesError ? "programme catalogue" : null,
    schedulesError ? "broadcast schedule" : null,
    episodesError ? "episode catalogue" : null,
  ].filter((section): section is string => section !== null);
  if (failedSections.length > 0) {
    return (
      <PageFrame className="ui-stack">
        <PageIntro eyebrow="Staff workspace · Radio" title="Radio programme & episode editor" description="Create and maintain approved programming, episodes and the weekly schedule." />
        {message ? <Notice tone={message.role === "alert" ? "danger" : "success"} role={message.role} aria-live={message.role === "alert" ? "assertive" : "polite"}>{message.text}</Notice> : null}
        <Notice tone="danger" role="alert" aria-live="assertive">
          Radio records could not be loaded: {failedSections.join(", ")}. No empty catalogue is inferred and no editing forms are shown. Reload the page to try again.
        </Notice>
      </PageFrame>
    );
  }
  const options = (_selected: string) => (programmes ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>);
  const statusOptions = (_value: string) => statuses.map(s => <option key={s} value={s}>{s}</option>);
  const labelClass = `${field} label`;
  const selectClass = `${input} w-full`;
  const btnClass = `${button} min-h-11 w-fit`;
  const privateHelp = <span className="ui-muted">Required whenever this record is published. Private note; never shown in the catalogue.</span>;
  const programmeForm = (p?: NonNullable<typeof programmes>[number]) => <Panel key={p?.id ?? "create-programme"} className="ui-stack-sm"><form action={saveProgramme} className="ui-stack-sm">{p ? <><input type="hidden" name="id" value={p.id}/><input type="hidden" name="revision" value={p.revision}/></> : null}<div className="ui-row ui-row--between"><h3 className="ui-item-title">{p ? p.name : "New programme"}</h3>{p ? <StatusBadge tone={p.publication_status === "published" ? "success" : "neutral"}>{p.publication_status} · rev {p.revision}</StatusBadge> : null}</div><div className="ui-form-grid"><label className={labelClass}>Name<input className={selectClass} name="name" required maxLength={120} defaultValue={p?.name}/></label><label className={labelClass}>Publication status<select className={selectClass} name="publication_status" defaultValue={p?.publication_status ?? "draft"}>{statusOptions(p?.publication_status ?? "draft")}</select></label></div><label className={labelClass}>Description<textarea className={selectClass} name="description" maxLength={4000} defaultValue={p?.description ?? ""}/></label><label className={labelClass}>{p ? "Fresh rights/source note (private)" : "Rights/source note (private)"}<textarea className={selectClass} name="rights_note" maxLength={2000}/>{p ? privateHelp : null}</label><button className={btnClass}>{p ? "Save programme" : "Create programme"}</button></form></Panel>;
  const scheduleForm = (s?: NonNullable<typeof schedules>[number]) => <Panel key={s?.id ?? "create-schedule"}><form action={saveSchedule} className="ui-stack-sm">{s ? <><input type="hidden" name="id" value={s.id}/><input type="hidden" name="revision" value={s.revision}/></> : null}<div className="ui-row ui-row--between"><h3 className="ui-item-title">{s ? `${dayNames[s.day_of_week]} schedule slot` : "Add schedule slot"}</h3>{s ? <StatusBadge tone={s.publication_status === "published" ? "success" : "neutral"}>{s.publication_status} · rev {s.revision}</StatusBadge> : null}</div><div className="ui-form-grid"><label className={labelClass}>Programme<select className={selectClass} name="programme_id" required defaultValue={s?.programme_id ?? ""}>{options(s?.programme_id ?? "")}</select></label><label className={labelClass}>Day<select className={selectClass} name="day_of_week" defaultValue={s?.day_of_week ?? 0}>{dayNames.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label><label className={labelClass}>Starts (Epe local time)<input className={selectClass} type="time" name="starts_at" required defaultValue={s?.starts_at.slice(0,5)}/></label><label className={labelClass}>Ends<input className={selectClass} type="time" name="ends_at" required defaultValue={s?.ends_at.slice(0,5)}/></label><label className={labelClass}>Note<input className={selectClass} name="note" maxLength={1000} defaultValue={s?.note ?? ""}/></label><label className={labelClass}>Publication status<select className={selectClass} name="publication_status" defaultValue={s?.publication_status ?? "draft"}>{statusOptions(s?.publication_status ?? "draft")}</select></label></div><label className={labelClass}>Rights/source note (private)<textarea className={selectClass} name="rights_note" maxLength={2000}/>{s ? privateHelp : null}</label><button className={btnClass}>{s ? "Save schedule slot" : "Add schedule slot"}</button></form></Panel>;
  const episodeForm = (e?: NonNullable<typeof episodes>[number]) => <Panel key={e?.id ?? "create-episode"}><form action={saveEpisode} className="ui-stack-sm">{e ? <><input type="hidden" name="id" value={e.id}/><input type="hidden" name="revision" value={e.revision}/></> : null}<div className="ui-row ui-row--between"><h3 className="ui-item-title">{e ? e.title : "Add episode"}</h3>{e ? <StatusBadge tone={e.publication_status === "published" ? "success" : "neutral"}>{e.publication_status} · rev {e.revision}</StatusBadge> : null}</div><div className="ui-form-grid"><label className={labelClass}>Programme<select className={selectClass} name="programme_id" required defaultValue={e?.programme_id ?? ""}>{options(e?.programme_id ?? "")}</select></label><label className={labelClass}>Title<input className={selectClass} name="title" required maxLength={200} defaultValue={e?.title}/></label><label className={labelClass}>Aired on<input className={selectClass} type="date" name="aired_on" defaultValue={e?.aired_on ?? ""}/></label><label className={labelClass}>Approved HTTPS media URL<input className={selectClass} type="url" name="external_url" placeholder="Optional" defaultValue={e?.external_url ?? ""}/></label><label className={labelClass}>Publication status<select className={selectClass} name="publication_status" defaultValue={e?.publication_status ?? "draft"}>{statusOptions(e?.publication_status ?? "draft")}</select></label></div><label className={labelClass}>Description<textarea className={selectClass} name="description" maxLength={4000} defaultValue={e?.description ?? ""}/></label><label className={labelClass}>Rights/source note (private)<textarea className={selectClass} name="rights_note" required={!e} minLength={e ? undefined : 3} maxLength={2000}/>{e ? privateHelp : null}</label><button className={btnClass}>{e ? "Save episode" : "Add episode"}</button></form></Panel>;
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace · Radio" title="Radio programme & episode editor" description="Create and maintain approved programming, episodes and the weekly schedule. Rights notes are private and saved atomically; audit records omit their text. Stream credentials and private evidence are never shown." meta={<span>Up to 100 programmes and episodes · 200 schedule slots</span>}/>{message ? <Notice tone={message.role === "alert" ? "danger" : "success"} role={message.role} aria-live={message.role === "alert" ? "assertive" : "polite"}>{message.text}</Notice> : null}{error ? <EmptyPanel title="Radio catalogue unavailable" description="The programme catalogue could not be loaded. No records are shown."/> : <div className="ui-stack"><section className="ui-stack"><SectionHeading eyebrow="01 · Catalogue" title="Programmes" description="Edit approved programme details and publication status."/>{programmes?.length ? <div className="ui-stack-sm">{programmes.map(p => programmeForm(p))}</div> : <EmptyPanel title="No programme records" description="There are no programmes yet. Create the first record below."/>}{programmeForm()}</section><section className="ui-stack"><SectionHeading eyebrow="02 · Broadcast" title="Schedule" description="Weekly broadcast slots in Epe local time."/>{schedules?.length ? <div className="ui-stack-sm">{schedules.map(s => scheduleForm(s))}</div> : <EmptyPanel title="No schedule slots" description="No broadcast times are listed yet."/>}{scheduleForm()}</section><section className="ui-stack"><SectionHeading eyebrow="03 · Episodes" title="Episodes" description="Attach episodes to a programme and manage approved media references."/>{episodes?.length ? <div className="ui-stack-sm">{episodes.map(e => episodeForm(e))}</div> : <EmptyPanel title="No episodes" description="No episodes are listed yet."/>}{episodeForm()}</section></div>}</PageFrame>;
}
