import RadioPlayer from "../../components/radio-player";
import { RadioIcon } from "../../components/icons";
import { createClient } from "../../lib/supabase";

export const dynamic = "force-dynamic";

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

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Community radio</p><h1 className="text-3xl font-bold tracking-tight">EPE LAWA Radio</h1><p className="mt-2 leading-relaxed text-muted-foreground">Live streaming is not yet available. Browse approved programme information, the schedule and published archive episodes.</p></header>
    <RadioPlayer />
    {unavailable ? <p className="mt-6 rounded-lg border p-4 text-sm" role="status">Programme information is temporarily unavailable. Please try again later.</p> : <>
      <section className="mt-8 rounded-lg border bg-card p-6"><h2 className="text-lg font-bold">Programmes</h2>{programmes.length ? <ul className="mt-3 grid gap-3">{programmes.map(x=><li key={x.id}><h3 className="font-semibold">{x.name}</h3>{x.description?<p className="text-sm text-muted-foreground">{x.description}</p>:null}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No approved programmes have been published yet.</p>}</section>
      <section className="mt-6 rounded-lg border bg-card p-6"><h2 className="text-lg font-bold">Schedule</h2>{slots.length ? <ul className="mt-3 grid gap-2">{slots.map(x=><li key={x.id}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][x.day_of_week]} · {x.starts_at.slice(0,5)}–{x.ends_at.slice(0,5)} · {x.programmes[0]?.name}{x.note?` — ${x.note}`:""}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No programme schedule has been published yet.</p>}</section>
      <section className="mt-6 rounded-lg border bg-card p-6"><h2 className="text-lg font-bold">Archive</h2>{episodes.length ? <ul className="mt-3 grid gap-4">{episodes.map(x=><li key={x.id}><h3 className="font-semibold">{x.title}</h3><p className="text-sm text-muted-foreground">{x.programmes[0]?.name}{x.aired_on?` · ${x.aired_on}`:""}</p>{x.description?<p className="mt-1 text-sm">{x.description}</p>:null}{x.external_url?<audio className="mt-2 w-full" controls preload="none" src={x.external_url}>Audio playback is not supported by this browser.</audio>:null}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No published archive episodes are available yet.</p>}</section>
    </>}
    <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><RadioIcon size={16}/>Stream availability is not verified; no live status is claimed.</div>
  </div>;
}
