"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PlayIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

const PauseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.5v13M15 5.5v13" />
  </svg>
);

const VolumeIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 5.5A.5.5 0 016 5v14a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-14a.5.5 0 01.5-.5h3.5a.5.5 0 011 1m-1 10l2.25-2.25.75.75 2 2-2 2-.75-.75-2.25-2.25z" />
  </svg>
);

const VolumeOffIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 5.5A.5.5 0 016 5v14a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-14a.5.5 0 01.5-.5h3.5a.5.5 0 011 1m-1 10l2.25-2.25.75.75 2 2-2 2-.75-.75-2.25-2.25zM11.5 8.5l3 3m0 0l3 3m-3-3l-3-3M11.5 15.5l3 3m0 0l3 3m-3-3l-3-3" />
  </svg>
);

const StopIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

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
          setError(err instanceof Error ? err.message : "Playback failed. Try again.");
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
    <section className="py-8" aria-labelledby="radio-player-title">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card p-6">
          <div className="mb-6">
            <h2 id="radio-player-title" className="text-xl font-bold text-foreground">
              Radio Lagos 107.5 FM
            </h2>
            <p className="text-sm text-muted-foreground">Epe Division · Lagos State · Àmitítí</p>
          </div>

          <div className="mb-6 flex items-center gap-2">
            {state === "unavailable" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-error-100)] text-[var(--color-error-700)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error-100)]0" />
                Unavailable
              </span>
            )}
            {state === "error" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-error-100)] text-[var(--color-error-700)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error-100)]0" />
                Playback error
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary flex-1"
              aria-busy={loading ? "true" : undefined}
              disabled={loading || state === "unavailable"}
              onClick={state === "idle" || state === "paused" ? play : pause}
            >
              <span className="flex items-center justify-center gap-2">
                {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                {loading ? "Buffering…" : playing ? "Pause" : "Play"}
              </span>
            </button>

            <button
              type="button"
              className="p-2 text-muted-foreground rounded-md hover:bg-muted transition-colors"
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
              className="w-24 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />

            <button
              type="button"
              className="p-2 text-muted-foreground rounded-md hover:bg-muted transition-colors"
              aria-label="Stop"
              disabled={state === "idle"}
              onClick={stop}
            >
              <StopIcon size={18} />
            </button>

            {state === "error" && (
              <button
                type="button"
                className="p-2 text-muted-foreground rounded-md hover:bg-muted transition-colors"
                aria-label="Retry"
                onClick={play}
              >
                <PlayIcon size={18} />
              </button>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {error
              ? `Playback failed: ${error}. The stream may be down — try again later.`
              : "The player connects directly to the broadcaster. Nothing starts until you press Play, and nothing claims to be live unless it has actually been verified."}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Stream via{" "}
            <a href="https://fm.puzzofme.com" target="_blank" rel="noopener" className="text-primary hover:underline">
              Powered by Naija Radio
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
