"use client";
import {useEffect,useRef} from "react";
import {usePathname,useSearchParams} from "next/navigation";

type Kind="roll"|"move"|"capture"|"win"|"message"|"click";
type Settings={sound:boolean;music:boolean};
const DEFAULTS:Settings={sound:true,music:true};
const ROOM_PATHS=new Set(["/room","/lobby","/chat","/game-online"]);

export default function LudoAudio(){
 const pathname=usePathname();
 const params=useSearchParams();
 const ctxRef=useRef<AudioContext|null>(null);
 const musicTimer=useRef<number|null>(null);
 const musicStep=useRef(0);
 const settingsRef=useRef(DEFAULTS);
 const roomRef=useRef(false);
 const settings=()=>{try{const raw=localStorage.getItem("ludo-settings");return raw?{...DEFAULTS,...JSON.parse(raw)}:DEFAULTS}catch{return DEFAULTS}};
 const inRoom=()=>ROOM_PATHS.has(pathname)||pathname==="/game"&&!!(params.get("room")||params.get("tournament"));
 const ensure=()=>{if(typeof window==="undefined")return null;try{const C=window.AudioContext||(window as any).webkitAudioContext;if(!ctxRef.current)ctxRef.current=new C();if(ctxRef.current.state==="suspended")void ctxRef.current.resume();return ctxRef.current}catch{return null}};
 const tone=(freq:number,duration:number,gainValue:number,type:OscillatorType="sine",when?:number)=>{const c=ensure();if(!c||!settingsRef.current.sound)return;const now=when??c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(0.0001,now);g.gain.exponentialRampToValueAtTime(gainValue,now+0.015);g.gain.exponentialRampToValueAtTime(0.0001,now+duration);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+duration+0.03)};
 const stopMusic=()=>{if(musicTimer.current!==null){window.clearInterval(musicTimer.current);musicTimer.current=null}musicStep.current=0};
 const startMusic=()=>{if(roomRef.current||!settingsRef.current.music)return;const c=ensure();if(!c||musicTimer.current!==null)return;const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];const tick=()=>{if(roomRef.current||!settingsRef.current.music){stopMusic();return}const chord=chords[musicStep.current%chords.length];const now=c.currentTime+0.03;chord.forEach((f,i)=>tone(f,1.45,0.012,i===0?"sine":"triangle",now+i*0.035));tone(chord[0]*2,0.65,0.006,"sine",now+0.42);tone(chord[1]*2,0.55,0.005,"sine",now+0.84);musicStep.current++};tick();musicTimer.current=window.setInterval(tick,1600)};
 const play=(kind:Kind)=>{settingsRef.current=settings();if(kind==="message")tone(740,.16,.028,"sine");else if(kind==="roll"){tone(180,.07,.035,"triangle");tone(250,.09,.03,"triangle",(ensure()?.currentTime||0)+.07)}else if(kind==="move")tone(520,.12,.025,"sine");else if(kind==="capture"){tone(440,.09,.025,"triangle");tone(660,.16,.025,"sine",(ensure()?.currentTime||0)+.09)}else if(kind==="win"){const c=ensure();if(c){const n=c.currentTime;[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.32,.035,"sine",n+i*.12))}}else tone(330,.06,.018,"sine")};
 useEffect(()=>{settingsRef.current=settings();roomRef.current=inRoom();const onGesture=()=>{if(!roomRef.current)startMusic()};const onSettings=()=>{settingsRef.current=settings();if(settingsRef.current.music&&!roomRef.current)startMusic();else stopMusic()};const onSfx=(e:Event)=>play(String((e as CustomEvent).detail||"click") as Kind);window.addEventListener("pointerdown",onGesture,{passive:true});window.addEventListener("keydown",onGesture,{passive:true});window.addEventListener("ludo-settings-updated",onSettings);window.addEventListener("ludo-audio",onSfx);if(roomRef.current)stopMusic();else if(settingsRef.current.music)startMusic();return()=>{window.removeEventListener("pointerdown",onGesture);window.removeEventListener("keydown",onGesture);window.removeEventListener("ludo-settings-updated",onSettings);window.removeEventListener("ludo-audio",onSfx);stopMusic()}},[pathname,params]);
 useEffect(()=>{roomRef.current=inRoom();if(roomRef.current)stopMusic();else if(settingsRef.current.music)startMusic()},[pathname,params]);
 return null;
}
