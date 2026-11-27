import type { Metadata } from "next";
import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import RadioListenButton from "../../components/radio-listen-button";
import RadioSchedule, { type RadioScheduleSlot } from "../../components/radio-schedule";
import { RadioReminderSettings } from "../../components/radio-reminder";
import SponsorSlot from "../../components/sponsor-slot";
import { ArrowRightIcon } from "../../components/icons";
import styles from "./radio-page.module.css";
import { pageMetadata } from "../../lib/metadata";
import { PUBLIC_SCHEDULE_COLUMNS, publicScheduleSlot } from "../../lib/radio-schedule";
import { createClient } from "../../lib/supabase";
import { lagosNow, onAirSlotId } from "./programmes/on-air";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "EPE LAWA Radio",
  description: "The sound of Epe. Listen to Radio Lagos 107.5 FM and Guts FM 104.9 on EPE LAWA, see the programme guide in WAT and get on-air notifications.",
  path: "/radio",
});

export default async function RadioPage() {
  let slots: RadioScheduleSlot[] = [];
  let unavailable = false;
  try {
    const db = await createClient();
    const { data, error } = await db.from("radio_schedule").select(PUBLIC_SCHEDULE_COLUMNS).eq("publication_status", "published").eq("programmes.publication_status", "published").eq("programmes.is_active", true).order("day_of_week").order("starts_at").limit(200);
    if (error) unavailable = true;
    else slots = (data ?? []).map(publicScheduleSlot);
  } catch { unavailable = true; }
  const onAirId = unavailable ? null : onAirSlotId(slots);
  const onAirName = onAirId ? slots.find((slot) => slot.id === onAirId)?.programme ?? null : null;

  return <div className={`${styles.page} page-full-bleed`}>
    <section className={styles.hero} aria-labelledby="radio-hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>EPE LAWA RADIO</p>
          <h1 id="radio-hero-title" className={styles.heroTitle}>The sound of Epe.</h1>
          <p className={styles.heroLede}>Stay connected to the people, stories and conversations shaping our community.</p>
          <div className={styles.heroActions}>
            <RadioListenButton className={styles.primaryAction} />
            <Link className={styles.secondaryAction} href="/radio/programmes">Explore programmes</Link>
          </div>
          <p className={styles.heroNote}>Streams start only when you press Play, and keep playing while you browse the rest of EPE LAWA.</p>
        </div>
        {/* The sponsor card is the business picked on the admin Ads desk; slimmer than before (turn 5). */}
        <RadioPlayer programme={onAirName}><SponsorSlot compact radio /></RadioPlayer>
      </div>
    </section>

    <div className={styles.content}>
      <RadioSchedule slots={slots} initialDay={lagosNow().day} unavailable={unavailable} />

      <section className={styles.reminder} aria-labelledby="radio-reminder-title">
        <div>
          <p className={styles.eyebrow}>On-air notifications</p>
          <h2 id="radio-reminder-title">Never miss a programme</h2>
        </div>
        <RadioReminderSettings confirm compact />
      </section>

      <section className={styles.explore} aria-labelledby="radio-explore-title">
        <div><p className={styles.eyebrow}>More from EPE LAWA</p><h2 id="radio-explore-title">Keep exploring</h2></div>
        <div className={styles.links}>
          <Link href="/radio/programmes"><span><strong>Programmes &amp; schedule</strong><small>Weekly programme grid</small></span><ArrowRightIcon size={20} /></Link>
          <Link href="/radio/reminders"><span><strong>Radio reminders</strong><small>Browser push when a programme starts</small></span><ArrowRightIcon size={20} /></Link>
          <Link href="/news"><span><strong>Latest news</strong><small>Stories from the newsroom</small></span><ArrowRightIcon size={20} /></Link>
        </div>
      </section>
    </div>
  </div>;
}
