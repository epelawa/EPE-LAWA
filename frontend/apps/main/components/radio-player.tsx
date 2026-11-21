"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PauseIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from "./icons";
import { RADIO_LAGOS_1075 } from "../lib/radio-lagos";
import type { GutsStation } from "../lib/guts-radio";
import styles from "./radio-player.module.css";

type PlaybackState = "connecting" | "playing" | "paused" | "blocked" | "unavailable" | "slow" | "offline";
function isAutoplayDenial(error: unknown) { return error instanceof DOMException && error.name === "NotAllowedError"; }
export default function RadioPlayer({ children }: { children?: ReactNode }) {
 const [guts,setGuts]=useState<GutsStation | null>(null);
 const [loadingGuts,setLoadingGuts]=useState(true);
 const [gutsReason,setGutsReason]=useState<"not_found" | "unavailable">("unavailable");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/radio/guts", { signal: controller.signal }).then(response=>response.ok ? response.json() : null).then(data=>{if(!controller.signal.aborted){setGuts(data?.station ?? null);setGutsReason(data?.reason === "not_found" ? "not_found" : "unavailable");}}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoadingGuts(false);});
  return ()=>controller.abort();
 },[]);
 const audioRef=useRef<HTMLAudioElement>(null);
 const attempt=useRef(0);
 const [chosen,setChosen]=useState<"lagos"|"guts">("lagos");
 const [state,setState]=useState<PlaybackState>("paused");
 const [volume,setVolume]=useState(.8), [muted,setMuted]=useState(false);
 const station=chosen === "lagos" ? RADIO_LAGOS_1075 : guts;
 useEffect(()=>{const audio=audioRef.current;if(audio){audio.volume=volume;audio.muted=muted;}},[volume,muted,chosen,station]);
 useEffect(()=>{
  const offline=()=>{attempt.current++;audioRef.current?.pause();setState("offline");};
  const online=()=>setState(current=>current === "offline" ? "paused" : current);
  if(!navigator.onLine) setState("offline");
  window.addEventListener("offline",offline);window.addEventListener("online",online);
  return ()=>{window.removeEventListener("offline",offline);window.removeEventListener("online",online);};
 },[]);
 useEffect(()=>{if(state!=="connecting")return;const timer=window.setTimeout(()=>setState(current=>current==="connecting"?"slow":current),8000);return()=>window.clearTimeout(timer);},[state]);
 function switchStation(next:"lagos"|"guts") {
  if(next===chosen)return; attempt.current++;audioRef.current?.pause();setChosen(next);setState(navigator.onLine ? "paused" : "offline");
 }
 async function togglePlayback() {
  const audio=audioRef.current;if(!audio || !station)return;
  if(!audio.paused){attempt.current++;audio.pause();setState("paused");return;}
  if(!navigator.onLine){setState("offline");return;}
  const id=++attempt.current; audio.load();setState("connecting");
  try {await audio.play();} catch(error) {if(attempt.current===id)setState(isAutoplayDenial(error)?"blocked":"unavailable");}
 }
 function changeVolume(value:number){setVolume(value);if(audioRef.current)audioRef.current.volume=value;if(value>0&&muted)setMuted(false);}
 const active = state === "playing" || state === "connecting" || state === "slow";
 const status={connecting:"Connecting…",playing:"Playing live",paused:"Ready to listen",blocked:"Tap Play to start",unavailable:"The station stream is unavailable right now. Please try again.",slow:"Still connecting — buffering…",offline:"Your device appears offline. Reconnect, then press Play."}[state];
 return <section className={`${styles.player} ${state==="playing" ? styles.playing : ""}`} aria-labelledby="radio-player-title">
  <div className={styles.bar}>
   <div className={styles.ident} aria-hidden="true"><img src="/brand-logo.png" alt="EPE LAWA" width="40" height="36" /><span className={styles.equalizer}>{[0,1,2,3].map(i=><span key={i} />)}</span></div>
   <div className={styles.info}>
    <h1 id="radio-player-title" className={styles.title}>{station?.name ?? "Radio"} <span className={styles.frequency}>{station?.frequency ?? ""}</span></h1>
    <p className={styles.status} role="status" aria-live="polite"><span className={`${styles.liveDot} ${state==="playing" ? styles.connected : ""}`} aria-hidden="true" />{station ? status : loadingGuts ? "Looking up Guts FM…" : gutsReason === "not_found" ? "No usable Guts FM stream was found in the catalogue." : "Guts FM is temporarily unavailable in this player. Please try again later."}</p>
   </div>
   {station ? <>
    <audio key={chosen} ref={audioRef} preload="none" playsInline src={station.streamUrl} onPlaying={()=>setState("playing")} onWaiting={()=>setState("connecting")} onStalled={()=>setState(current=>current==="playing"||current==="connecting"?"slow":current)} onError={()=>setState(navigator.onLine?"unavailable":"offline")} onPause={()=>setState(current=>current==="playing"?"paused":current)} />
    <div className={styles.controls}>
     <button className={styles.muteButton} type="button" onClick={()=>{if(volume===0){changeVolume(.8);setMuted(false);}else setMuted(!muted);}} aria-label={muted||volume===0?"Unmute":"Mute"}>{muted||volume===0?<VolumeOffIcon size={18}/>:<VolumeOnIcon size={18}/>}</button>
     <input id="radio-volume" className={styles.volume} type="range" min="0" max="1" step="0.01" value={volume} onChange={event=>changeVolume(Number(event.target.value))} aria-label="Volume" />
     <button className={styles.playButton} type="button" onClick={()=>void togglePlayback()} aria-label={`${active?"Pause":"Play"} ${station.name}`}>{active?<PauseIcon size={22}/>:<PlayIcon size={22}/>}</button>
    </div>
   </> : <a className={styles.external} href="https://gutsfm1049.com/online-radio/" target="_blank" rel="noreferrer">Guts FM page ↗</a>}
  </div>
  <div className={styles.stationList} role="group" aria-label="Choose a station">
   <button type="button" aria-pressed={chosen==="lagos"} onClick={()=>switchStation("lagos")}><span className={styles.stationIcon} aria-hidden="true">RL</span><span className={styles.stationInfo}><strong>Radio Lagos</strong><small>107.5 FM</small></span><span className={styles.selectMark} aria-hidden="true">{chosen==="lagos" ? "✓" : "→"}</span></button>
   <button type="button" aria-pressed={chosen==="guts"} onClick={()=>switchStation("guts")}><span className={`${styles.stationIcon} ${styles.gutsIcon}`} aria-hidden="true">GF</span><span className={styles.stationInfo}><strong>Guts FM</strong><small>104.9 FM</small></span><span className={styles.selectMark} aria-hidden="true">{chosen==="guts" ? "✓" : "→"}</span></button>
  </div>
  {children ? <div className={styles.sponsor}>{children}</div> : null}
  <p className={styles.provider}>Guts FM catalogue powered by <a href="https://fm.puzzofme.com/" target="_blank" rel="noreferrer">Naija Radio ↗</a></p>
 </section>;
}
