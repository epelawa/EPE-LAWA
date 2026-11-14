"use client";

import { useState } from "react";
import { Panel, SectionHeading } from "./design-system";
import { RADIO_LAGOS_1075 } from "../lib/radio-lagos";

type PlaybackState = "ready" | "starting" | "playing" | "buffering" | "unavailable";

const statusText: Record<PlaybackState, string> = {
  ready: "Press play to start the station stream.",
  starting: "Connecting to Radio Lagos…",
  playing: "Playing Radio Lagos 107.5 FM.",
  buffering: "Buffering Radio Lagos 107.5 FM…",
  unavailable: "The direct stream could not be played.",
};

export default function RadioPlayer() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("ready");

  return (
    <Panel className="ui-subtle" aria-labelledby="radio-player-title" data-station-id={RADIO_LAGOS_1075.id}>
      <div className="ui-stack-sm">
        <SectionHeading
          eyebrow="External station stream"
          title={<span id="radio-player-title">{RADIO_LAGOS_1075.name} · {RADIO_LAGOS_1075.frequency}</span>}
          description="Playback starts only when you press play."
        />
        <audio
          aria-label={`${RADIO_LAGOS_1075.name} ${RADIO_LAGOS_1075.frequency} player`}
          className="w-full"
          controls
          preload="none"
          src={RADIO_LAGOS_1075.streamUrl}
          onPlay={() => setPlaybackState("starting")}
          onPlaying={() => setPlaybackState("playing")}
          onWaiting={() => setPlaybackState("buffering")}
          onStalled={() => setPlaybackState("unavailable")}
          onError={() => setPlaybackState("unavailable")}
          onPause={() => setPlaybackState((state) => state === "unavailable" ? state : "ready")}
        >
          Your browser does not support audio playback.
        </audio>
        <p className="ui-meta" role="status" aria-live="polite" aria-atomic="true">
          {statusText[playbackState]}
        </p>
        {playbackState === "unavailable" ? (
          <a className="ui-text-link" href={RADIO_LAGOS_1075.listenUrl}>
            Open the official Radio Lagos listen page
          </a>
        ) : null}
      </div>
    </Panel>
  );
}
