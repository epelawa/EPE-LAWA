import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { ArrowRightIcon } from "../../components/icons";
import { PageFrame } from "../../components/design-system";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";
import { createClient } from "../../lib/supabase";
import SongRequestModal from "./request-modal";
import SponsorSlot from "../../components/sponsor-slot";
import { onAirSlotId } from "./programmes/on-air";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "EPE LAWA Radio", description: "Listen to Radio Lagos and discover Guts FM on EPE LAWA.", path: "/radio" });

export default async function RadioPage() {
  let programmes: Array<{ id: string; name: string }> = [];
  let slots: Array<{ id: string; day_of_week: number; starts_at: string; ends_at: string; programmes: Array<{ name: string }> }> = [];
  let signedIn = false;
  let unavailable = false;
  try {
    const db = await createClient();
    const [{ data: { user } }, p, s] = await Promise.all([
      db.auth.getUser(),
      db.from("programmes").select("id,name").eq("is_active", true).order("name").limit(100),
      db.from("radio_schedule").select("id,day_of_week,starts_at,ends_at,programmes(name)").limit(200),
    ]);
    signedIn = Boolean(user);
    if (p.error || s.error) unavailable = true;
    else { programmes = p.data ?? []; slots = s.data ?? []; }
  } catch { unavailable = true; }
  const onAirId = unavailable ? null : onAirSlotId(slots);
  const onAirName = onAirId ? slots.find(slot => slot.id === onAirId)?.programmes?.[0]?.name ?? null : null;

  return <PageFrame className={styles.listeningPage}>
    <section id="live-player" className={styles.playerWrap} aria-label="Radio stations">
      {/* The sponsor card is the business picked on the admin Ads desk, with its logo. */}
      <RadioPlayer><SponsorSlot compact /></RadioPlayer>
      {/* Only a scheduled EPE LAWA programme earns the red on-air marker; otherwise the stations run their own programming. */}
      <div className={styles.nowPlaying} role="status" data-on-air={onAirName ? "scheduled" : "idle"}>
        <span className={onAirName ? styles.onAirDot : styles.idleDot} aria-hidden="true" />
        {onAirName ? <span><strong>On air now:</strong> {onAirName} <span className={styles.scheduleNote}>(per schedule)</span></span> : <span>{unavailable ? "The programme schedule is unavailable right now." : "No EPE LAWA programme is scheduled right now. Stations play their own programming."}</span>}
      </div>
      <div className={styles.requestRow}>
        <SongRequestModal programmes={programmes} signedIn={signedIn} />
        <Link href="/radio/archive" className="btn-ghost">Browse the archive</Link>
      </div>
    </section>
    <section className={styles.explore} aria-labelledby="radio-explore-title"><div><p className={styles.eyebrow}>MORE FROM EPE LAWA</p><h2 id="radio-explore-title">Keep exploring</h2></div><div className={styles.links}>
      <Link href="/radio/programmes"><span><strong>Programmes &amp; schedule</strong><small>Weekly programme grid</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/radio/archive"><span><strong>Programme archive</strong><small>Past episodes to replay</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/radio/reminders"><span><strong>Radio reminders</strong><small>Choose your listening reminders</small></span><ArrowRightIcon size={20} /></Link>
      <Link href="/news"><span><strong>Latest news</strong><small>Stories from the newsroom</small></span><ArrowRightIcon size={20} /></Link>
    </div></section>
  </PageFrame>;
}
