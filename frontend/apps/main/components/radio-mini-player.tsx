"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { PauseIcon, PlayIcon } from "./icons";
import { currentStation, hideMiniPlayer, isActive, toggle, useRadio } from "../lib/radio-store";
import styles from "./radio-mini-player.module.css";

/**
 * Site-wide mini-player. It appears only after the listener has pressed Play,
 * never on /radio itself (the full player is there) and never in the staff
 * workspace. Hiding it does not stop the stream; the next Play brings it back.
 * While it is open, <html data-radio-mini="open"> and --radio-mini-offset let
 * floating controls (the Support button) and the footer move out of its way.
 */
export default function RadioMiniPlayer() {
  const pathname = usePathname() ?? "/";
  const radio = useRadio();
  const ref = useRef<HTMLDivElement>(null);
  const excluded = pathname === "/radio" || pathname.startsWith("/admin");
  const open = radio.started && !radio.miniHidden && !excluded && radio.status !== "idle";

  useEffect(() => {
    const root = document.documentElement;
    const node = ref.current;
    if (!open || !node) {
      root.removeAttribute("data-radio-mini");
      root.style.removeProperty("--radio-mini-offset");
      return;
    }
    const apply = () => {
      const top = node.getBoundingClientRect().top;
      root.style.setProperty("--radio-mini-offset", `${Math.max(0, Math.round(window.innerHeight - top))}px`);
    };
    root.setAttribute("data-radio-mini", "open");
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      root.removeAttribute("data-radio-mini");
      root.style.removeProperty("--radio-mini-offset");
    };
  }, [open]);

  if (!open) return null;
  const { name, frequency } = currentStation(radio);
  const active = isActive(radio.status);
  const state = radio.status === "playing" ? "Live" : radio.status === "connecting" || radio.status === "slow" ? "Connecting…" : radio.status === "offline" ? "Offline" : radio.status === "error" || radio.status === "blocked" ? "Not playing, tap Play to retry" : "Paused";

  return <div ref={ref} className={styles.mini} role="region" aria-label="Radio mini-player" data-state={radio.status}>
    <button className={styles.play} type="button" onClick={() => toggle()} aria-label={`${active ? "Pause" : "Play"} ${name}`}>
      {active ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
    </button>
    <Link className={styles.info} href="/radio" aria-label={`Return to the radio page. ${name} ${frequency}, ${state}`}>
      <span className={styles.name}>{name} <span className={styles.frequency}>{frequency}</span></span>
      <span className={styles.state} data-live={radio.status === "playing" ? "true" : "false"}>{state}</span>
    </Link>
    <button className={styles.close} type="button" onClick={() => hideMiniPlayer()} aria-label={active ? "Hide mini-player (the radio keeps playing)" : "Hide mini-player"}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  </div>;
}
