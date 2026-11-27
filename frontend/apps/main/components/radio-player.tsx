"use client";

import type { ReactNode } from "react";
import { PauseIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from "./icons";
import {
  GUTS_LABEL, LAGOS_STATION, currentStation, isActive, play, selectStation, setVolume, statusMessage, toggle, toggleMute, useRadio,
  type StationId,
} from "../lib/radio-store";
import styles from "./radio-player.module.css";

const STATIONS: Array<{ id: StationId; name: string; frequency: string; mark: string }> = [
  { id: "lagos", name: LAGOS_STATION.name, frequency: LAGOS_STATION.frequency, mark: "RL" },
  { id: "guts", name: GUTS_LABEL.name, frequency: GUTS_LABEL.frequency, mark: "GF" },
];

/**
 * The main /radio player. Playback itself lives in lib/radio-store so the same
 * stream keeps running in the site-wide mini-player after the listener leaves
 * this page. Nothing is fetched until Play is pressed (preload="none" and a
 * lazily created audio element), and "Live" is only shown while audio is
 * actually playing.
 */
export default function RadioPlayer({ programme, children }: { programme?: string | null; children?: ReactNode }) {
  const radio = useRadio();
  const station = currentStation(radio);
  const active = isActive(radio.status);
  const playing = radio.status === "playing";
  const failed = radio.status === "error" || radio.status === "blocked";
  const name = station?.name ?? (radio.stationId === "guts" ? GUTS_LABEL.name : LAGOS_STATION.name);
  const frequency = station?.frequency ?? (radio.stationId === "guts" ? GUTS_LABEL.frequency : LAGOS_STATION.frequency);
  const indicator = playing ? "Live" : radio.status === "connecting" || radio.status === "slow" ? "Connecting" : radio.status === "offline" ? "Offline" : failed ? "Unavailable" : "Not playing";
  const gutsMissing = radio.stationId === "guts" && (radio.guts.state === "not_found" || radio.guts.state === "unavailable");
  const muted = radio.muted || radio.volume === 0;

  return <section id="live-player" className={styles.player} data-state={radio.status} aria-labelledby="radio-player-title">
    <div className={styles.head}>
      <p className={styles.kicker}>Listen</p>
      <span className={styles.indicator} data-live={playing ? "true" : "false"}><span className={styles.dot} aria-hidden="true" />{indicator}{playing ? <span className={styles.wave} aria-hidden="true"><i /><i /><i /><i /></span> : null}</span>
    </div>

    <div className={styles.main}>
      <button
        className={styles.playButton}
        type="button"
        onClick={() => toggle()}
        aria-label={`${active ? "Pause" : "Play"} ${name} ${frequency}`}
      >{active ? <PauseIcon size={26} /> : <PlayIcon size={26} />}</button>
      <div className={styles.nowPlaying}>
        <p className={styles.nowLabel}>Now playing</p>
        <h2 id="radio-player-title" className={styles.title}>{name} <span className={styles.frequency}>{frequency}</span></h2>
        <p className={styles.programme}>{programme
          ? <><span className={styles.scheduleTag}>Scheduled now</span> {programme}</>
          : playing ? "You're listening to EPE LAWA Radio." : "EPE LAWA Radio"}</p>
      </div>
    </div>

    <p className={styles.status} role="status" aria-live="polite">{statusMessage(radio)}</p>
    {failed || radio.status === "offline" ? <button className={styles.retry} type="button" onClick={() => void play()}>Try again</button> : null}

    <div className={styles.controls}>
      <button className={styles.iconButton} type="button" onClick={() => toggleMute()} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
        {muted ? <VolumeOffIcon size={18} /> : <VolumeOnIcon size={18} />}
      </button>
      <label className={styles.volumeLabel}>
        <span className="sr-only">Volume</span>
        <input
          className={styles.volume}
          type="range" min="0" max="1" step="0.05"
          value={muted ? 0 : radio.volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          aria-valuetext={`${Math.round((muted ? 0 : radio.volume) * 100)} percent`}
        />
      </label>
    </div>

    <div className={styles.stationList} role="group" aria-label="Choose a station">
      {STATIONS.map((item) => <button key={item.id} type="button" aria-pressed={radio.stationId === item.id} onClick={() => selectStation(item.id)}>
        <span className={styles.stationMark} aria-hidden="true">{item.mark}</span>
        <span className={styles.stationInfo}><strong>{item.name}</strong><small>{item.frequency}</small></span>
      </button>)}
    </div>
    {gutsMissing ? <p className={styles.note}>
      The Guts FM stream could not be found just now. <a href="https://gutsfm1049.com/online-radio/" target="_blank" rel="noreferrer">Listen on the Guts FM website<span className="sr-only"> (opens in a new tab)</span></a>.
    </p> : null}

    {children ? <div className={styles.sponsor}>{children}</div> : null}
  </section>;
}
