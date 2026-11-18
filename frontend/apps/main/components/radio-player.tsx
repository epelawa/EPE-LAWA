"use client";
import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, VolumeOffIcon, VolumeOnIcon } from "./icons";
import { RADIO_LAGOS_1075 } from "../lib/radio-lagos";
import type { GutsStation } from "../lib/guts-radio";
import styles from "./radio-player.module.css";

type PlaybackState = "connecting" | "playing" | "paused" | "blocked" | "unavailable" | "slow" | "offline";
function isAutoplayDenial(error: unknown) { return error instanceof DOMException && error.name === "NotAllowedError"; }
export default function RadioPlayer() {
 const [guts,setGuts]=useState<GutsStation | null>(null);
 const [loadingGuts,setLoadingGuts]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/radio/guts", { signal: controller.signal }).then(response=>response.ok ? response.json() : null).then(data=>{if(!controller.signal.aborted)setGuts(data?.station ?? null);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoadingGuts(false);});
  return ()=>controller.abort();
 },[]);
 const audioRef=useRef<HTMLAudioElement>(null);
 const attempt=useRef(0);
 const [chosen,setChosen]=useState<"lagos"|"guts">("lagos");
 const [state,setState]=useState<PlaybackState>("paused");
 const [volume,setVolume]=useState(.8), [muted,setMuted]=useState(false);
 const station=chosen === "lagos" ? RADIO_LAGOS_1075 : guts;
 useEffect(()=>{const audio=audioRef.current;if(audio){audio.volume=volume;audio.muted=muted;}},[volume,muted,chosen]);
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
 const status={connecting:"Connecting to the station…",playing:"Audio is playing",paused:"Ready to listen",blocked:"Your browser blocked playback. Tap Play to listen.",unavailable:"The station stream is unavailable right now. Please try again.",slow:"Connection is taking longer than expected. The stream may be buffering.",offline:"Your device appears offline. Reconnect, then press Play."}[state];
 return <section className={styles.player} aria-labelledby="radio-player-title">
  <div className={styles.topline}><span className={styles.eyebrow}>YOUR LISTENING SPACE</span><span className={styles.frequency}>{station?.frequency ?? "Guts FM"}</span></div>
  <div className={styles.stationList} role="group" aria-label="Choose a station">
   <button type="button" aria-pressed={chosen==="lagos"} onClick={()=>switchStation("lagos")}><strong>Radio Lagos</strong><span>107.5 FM</span></button>
   <button type="button" aria-pressed={chosen==="guts"} onClick={()=>switchStation("guts")}><strong>Guts FM</strong><span>104.9 FM</span></button>
  </div>
  {station ? <>
   <audio key={chosen} ref={audioRef} preload="none" playsInline src={station.streamUrl} onPlaying={()=>setState("playing")} onWaiting={()=>setState("connecting")} onStalled={()=>setState(current=>current==="playing"||current==="connecting"?"slow":current)} onError={()=>setState(navigator.onLine?"unavailable":"offline")} onPause={()=>setState(current=>current==="playing"?"paused":current)} />
   <div className={styles.main}><div className={styles.mark} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m4 9 14-6M4 9h16v11H4z"/><circle cx="9" cy="14.5" r="2.5"/><path d="M14 12h4m-4 3h4m-4 3h4"/></svg></div><div className={styles.identity}><p className={styles.city}>YOUR SELECTED STATION</p><h2 id="radio-player-title">{station.name}</h2><p className={styles.status} role="status" aria-live="polite"><span className={`${styles.liveDot} ${state==="playing"?styles.connected:""}`} aria-hidden="true"/> {status}</p></div><button className={styles.playButton} type="button" onClick={()=>void togglePlayback()} aria-label={`${active?"Pause":"Play"} ${station.name}`}>{active?<PauseIcon size={18}/>:<PlayIcon size={18}/>}<span>{active?"Pause":"Play station"}</span></button></div>
   {(state==="unavailable" || state==="offline" || state==="blocked" || state==="slow") && <div className={styles.notice}><span>{status}</span></div>}
   <div className={styles.controls}><button className={styles.muteButton} type="button" onClick={()=>{if(volume===0){changeVolume(.8);setMuted(false);}else setMuted(!muted);}} aria-label={muted||volume===0?"Unmute":"Mute"}>{muted||volume===0?<VolumeOffIcon size={18}/>:<VolumeOnIcon size={18}/>}<span>{muted||volume===0?"Unmute":"Mute"}</span></button><label className={styles.volumeLabel} htmlFor="radio-volume">Volume</label><input id="radio-volume" className={styles.volume} type="range" min="0" max="1" step="0.01" value={volume} onChange={event=>changeVolume(Number(event.target.value))}/><span className={styles.volumeValue}>{Math.round(volume*100)}%</span></div>
  </> : <div className={styles.unavailable}><h2 id="radio-player-title">Guts FM</h2><p role="status">{loadingGuts ? "Looking up Guts FM…" : "Guts FM is temporarily unavailable in this player. Please try again later."}</p><a href="https://gutsfm1049.com/online-radio/" target="_blank" rel="noreferrer">Visit Guts FM’s listening page ↗</a></div>}
  <p className={styles.provider}>Guts FM catalogue powered by <a href="https://fm.puzzofme.com/" target="_blank" rel="noreferrer">Naija Radio ↗</a></p>
 </section>;
}
