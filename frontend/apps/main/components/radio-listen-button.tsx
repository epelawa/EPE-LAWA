"use client";

import { PauseIcon, PlayIcon } from "./icons";
import { isActive, toggle, useRadio } from "../lib/radio-store";

/** Hero action. It starts the same shared stream as the main player, never a second one. */
export default function RadioListenButton({ className }: { className?: string }) {
  const radio = useRadio();
  const active = isActive(radio.status);
  return <button type="button" className={className} onClick={() => toggle()} aria-controls="live-player">
    {active ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
    {active ? "Pause radio" : "Listen live"}
  </button>;
}
