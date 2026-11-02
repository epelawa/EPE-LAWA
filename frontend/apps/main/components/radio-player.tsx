"use client";

import {
  CloseIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "@epelawa/ui";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Radio player.
 *
 * Plays the verified Radio Lagos 107.5 FM stream from the Naija Radio API catalogue.
 * Honest states only: the UI never claims "LIVE" because live status has not been
 * independently verified. The stream URL itself is real and playable, verified by an
 * HTTP HEAD + MP3 frame check before this page was written.
 */

const STREAM_URL =
  "https://azstream.elektranbroadcast.com/listen/radiolagos1075/radio.mp3";

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error" | "unavailable";

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    audio.src = STREAM_URL;
    audio.volume = muted ? 0 : volume;
    const promise = audio.play();
    if (promise !== undefined) {
      promise
        .then(() => setState("playing"))
        .catch((err) => {
          if (!isMountedRef.current) return;
          setState("error");
          setError(
            err instanceof Error ? err.message : "Playback failed. Try again.",
          );
        });
    } else {
      setState("playing");
    }
  }, [volume, muted]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setState("paused");
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setState("idle");
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setMuted((prev) => {
      const next = !prev;
      audio.muted = next;
      audio.volume = next ? 0 : volume;
      return next;
    });
  }, [volume]);

  const setVolumeLevel = useCallback(
    (value: number) => {
      const audio = audioRef.current;
      setVolume(value);
      if (!audio) return;
      audio.muted = false;
      audio.volume = value;
      setMuted(false);
    },
    [],
  );

  // Keep React state in sync with the native element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadStart = () => setState("loading");
    const onLoadedMetadata = () => {
      if (state !== "error") setState("playing");
    };
    const onPlaying = () => setState("playing");
    const onPause = () => setState("paused");
    const onWaiting = () => setState("loading");
    const onEnded = () => setState("idle");
    const onError = () => {
      setState("error");
      setError(audio.error?.message ?? "Playback error.");
    };

    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [state, volume]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  const playing = state === "playing";
  const loading = state === "loading";
  const mutedOrZero = muted || volume === 0;

  return (
    <section className="radio-player" aria-labelledby="radio-player-title">
      <div className="radio-player__inner ep-container">
        <div className="radio-player__header">
          <h2 id="radio-player-title" className="radio-player__title">
            Radio Lagos 107.5 FM
          </h2>
          <p className="radio-player__subtitle">Epe Division · Lagos State · Àmitítí</p>
        </div>

        <div className="radio-player__status">
          {state === "unavailable" && (
            <span className="radio-player__pill radio-player__pill--offline">
              <span className="radio-player__pill-dot" aria-hidden="true" />
              Unavailable
            </span>
          )}
          {state === "error" && (
            <span className="radio-player__pill radio-player__pill--error">
              <span className="radio-player__pill-dot" aria-hidden="true" />
              Playback error
            </span>
          )}
        </div>

        <div className="radio-player__controls">
          <button
            type="button"
            className={`
              ep-btn ep-btn--primary radio-player__play ${
                loading ? "ep-btn--loading" : ""
              }
            `}
            aria-busy={loading ? "true" : undefined}
            disabled={loading || state === "unavailable"}
            onClick={state === "idle" || state === "paused" ? play : pause}
          >
            <span className="ep-btn__label">
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
              {loading ? "Buffering…" : playing ? "Pause" : "Play"}
            </span>
          </button>

          <button
            type="button"
            className="ep-icon-btn radio-player__mute"
            aria-label={mutedOrZero ? "Unmute" : "Mute"}
            onClick={toggleMute}
            aria-pressed={mutedOrZero ? "true" : undefined}
          >
            {mutedOrZero ? <VolumeOffIcon size={18} /> : <VolumeIcon size={18} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => setVolumeLevel(Number(e.target.value))}
            aria-label="Volume"
            className="radio-player__volume"
          />

          <button
            type="button"
            className="ep-icon-btn radio-player__stop"
            aria-label="Stop"
            disabled={state === "idle"}
            onClick={stop}
          >
            <DownloadIcon size={18} />
          </button>

          {state === "error" && (
            <button
              type="button"
              className="ep-icon-btn radio-player__retry"
              aria-label="Retry"
              onClick={play}
            >
              <PlayIcon size={18} />
            </button>
          )}
        </div>

        <p className="radio-player__note">
          {error && `Playback failed: ${error}. The stream may be down — try again later.`}{" "}
          {!error && (
            <>
              The player connects directly to the broadcaster. Nothing starts until you press
              Play, and nothing claims to be live unless it has actually been verified.
            </>
          )}
        </p>

        <p className="radio-player__credit">
          Stream via <a href="https://fm.puzzofme.com" target="_blank" rel="noopener">
            Powered by Naija Radio
          </a>
        </p>
      </div>
    </section>
  );
}
