// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { NotificationSoundListener, NotificationSoundSettings } from "../apps/main/components/notification-sound";
import { NOTIFICATION_SOUND_EVENT, NOTIFICATION_SOUND_STORAGE } from "../apps/main/lib/notification-sound";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("requires an explicit opt-in and plays once per foreground event", async () => {
 const start=vi.fn(), stop=vi.fn();
 class AudioMock { state="running"; currentTime=0; destination={}; resume=vi.fn(); createOscillator(){return {type:"",frequency:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),start,stop};} createGain(){return {gain:{setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};} }
 vi.stubGlobal("AudioContext",AudioMock); localStorage.clear();
 Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"});
 const el=document.createElement("div"); document.body.append(el); const root=createRoot(el);
 await act(async()=>root.render(<><NotificationSoundListener/><NotificationSoundSettings/></>));
 const send=(id:string)=>window.dispatchEvent(new CustomEvent(NOTIFICATION_SOUND_EVENT,{detail:{type:NOTIFICATION_SOUND_EVENT,id}}));
 await act(async()=>send("before")); expect(start).not.toHaveBeenCalled();
 await act(async()=>el.querySelector("button")!.click()); expect(localStorage.getItem(NOTIFICATION_SOUND_STORAGE)).toBe("on"); expect(start).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledWith(5);
 await act(async()=>{send("new_1");send("new_1");}); expect(start).toHaveBeenCalledTimes(2);
 Object.defineProperty(document,"visibilityState",{configurable:true,value:"hidden"});
 await act(async()=>send("new_2")); expect(start).toHaveBeenCalledTimes(2);
 await act(async()=>el.querySelector("button")!.click()); expect(localStorage.getItem(NOTIFICATION_SOUND_STORAGE)).toBeNull(); expect(stop).toHaveBeenCalledWith();
 act(()=>root.unmount()); el.remove(); localStorage.clear(); vi.unstubAllGlobals();
});
