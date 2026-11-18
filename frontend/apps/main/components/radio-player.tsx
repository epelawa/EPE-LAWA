"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from "./icons";
import { RADIO_LAGOS_1075 } from "../lib/radio-lagos";
import styles from "./radio-player.module.css";

type PlaybackState = "connecting" | "playing" | "paused" | "blocked" | "unavailable";

function isAutoplayDenial(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlaybackState>("connecting");
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  // Try playback when the route mounts. The browser's `playing` event—not this
  // attempt—is the only point at which the UI reports that audio is playing.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch((error: unknown) => {
      setState(isAutoplayDenial(error) ? "blocked" : "unavailable");
    });
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setState("paused");
      return;
    }
    // A paused live stream can retain old buffered audio. Reconnect on every
    // user-initiated resume instead of continuing from the old buffer.
    audio.load();
    setState("connecting");
    try {
      await audio.play();
    } catch (error) {
      setState(isAutoplayDenial(error) ? "blocked" : "unavailable");
    }
  }

  function changeVolume(value: number) {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
    if (value > 0 && muted) setMuted(false);
  }

  const status = {
    connecting: "Connecting to the official station stream…",
    playing: "Live stream connected · audio is playing",
    paused: "Playback paused",
    blocked: "Your browser blocked automatic playback. Tap Play to listen.",
    unavailable: "The station stream is unavailable right now. Please try again later.",
  }[state];

  return (
    <section className={styles.player} aria-labelledby="radio-player-title" data-station-id={RADIO_LAGOS_1075.id}>
      <audio
        ref={audioRef}
        preload="none"
        autoPlay
        playsInline
        src={RADIO_LAGOS_1075.streamUrl}
        onPlaying={() => setState("playing")}
        onWaiting={() => setState("connecting")}
        onError={() => setState("unavailable")}
        onPause={() => setState((current) => current === "unavailable" || current === "blocked" ? current : "paused")}
      />
      <div className={styles.topline}>
        <span className={`${styles.liveDot} ${state === "playing" ? styles.connected : ""}`} aria-hidden="true" />
        <span className={styles.eyebrow}>OFFICIAL STATION STREAM</span>
        <span className={styles.frequency}>{RADIO_LAGOS_1075.frequency}</span>
      </div>
      <div className={styles.main}>
        <div className={styles.mark} aria-hidden="true"><span>RL</span><i /></div>
        <div className={styles.identity}>
          <p className={styles.city}>{RADIO_LAGOS_1075.city}, Nigeria</p>
          <h2 id="radio-player-title">{RADIO_LAGOS_1075.name}</h2>
          <p className={styles.status} role="status" aria-live="polite">{status}</p>
        </div>
        <button className={styles.playButton} type="button" onClick={() => void togglePlayback()} aria-label={state === "playing" ? "Pause Radio Lagos" : "Play Radio Lagos"}>
          {state === "playing" ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          <span>{state === "playing" ? "Pause" : state === "blocked" ? "Tap to play" : "Play live"}</span>
        </button>
      </div>
      {(state === "blocked" || state === "unavailable") && (
        <div className={state === "blocked" ? styles.notice : styles.error}>
          <strong>{state === "blocked" ? "Playback needs your permission" : "Unable to connect"}</strong>
          <span>{state === "blocked" ? "Press the Play button to start listening." : "Check your connection and try again later."}</span>
          {state === "unavailable" && RADIO_LAGOS_1075.listenUrl && <a href={RADIO_LAGOS_1075.listenUrl} target="_blank" rel="noreferrer">Open Radio Lagos listen page ↗</a>}
        </div>
      )}
      <div className={styles.controls}>
        <button className={styles.muteButton} type="button" onClick={() => { const next = !muted; setMuted(next); if (audioRef.current) audioRef.current.muted = next; }} aria-label={muted || volume === 0 ? "Unmute" : "Mute"}>
          {muted || volume === 0 ? <VolumeOffIcon size={18} /> : <VolumeOnIcon size={18} />}
          <span>{muted || volume === 0 ? "Unmute" : "Mute"}</span>
        </button>
        <label className={styles.volumeLabel} htmlFor="radio-volume">Volume</label>
        <input id="radio-volume" className={styles.volume} type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} aria-label="Volume" />
        <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
      </div>
    </section>
  );
}
