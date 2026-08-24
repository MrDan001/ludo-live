"use client";

import { useEffect, useRef } from "react";

type SoundKind = "dice" | "move" | "capture" | "safe" | "home" | "win";

export default function LudoAudio(){
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const play = (kind: SoundKind) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = ctxRef.current || new AudioCtx();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, now);
        compressor.knee.setValueAtTime(8, now);
        compressor.ratio.setValueAtTime(6, now);
        compressor.attack.setValueAtTime(0.003, now);
        compressor.release.setValueAtTime(0.16, now);
        compressor.connect(ctx.destination);
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.connect(compressor);

        const tone=(freq:number,duration:number,start:number,gain:number,type:OscillatorType="sine",endFreq?:number)=>{
          const osc=ctx.createOscillator(),g=ctx.createGain();
          osc.type=type; osc.frequency.setValueAtTime(freq,now+start);
          if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),now+start+duration);
          g.gain.setValueAtTime(0.0001,now+start);g.gain.exponentialRampToValueAtTime(gain,now+start+0.006);g.gain.exponentialRampToValueAtTime(0.0001,now+start+duration);
          osc.connect(g);g.connect(master);osc.start(now+start);osc.stop(now+start+duration+0.015);
        };
        const softNoise=(duration:number,start:number,gain:number)=>{
          const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
          const buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
          for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*0.7;
          const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
          filter.type="lowpass";filter.frequency.setValueAtTime(1900,now+start);filter.Q.setValueAtTime(0.45,now+start);
          g.gain.setValueAtTime(0.0001,now+start);g.gain.exponentialRampToValueAtTime(gain,now+start+0.012);g.gain.exponentialRampToValueAtTime(0.0001,now+start+duration);
          source.buffer=buffer;source.connect(filter);filter.connect(g);g.connect(master);source.start(now+start);source.stop(now+start+duration+0.01);
        };

        if(kind==="dice"){
          // Soft felt/tabletop roll: low, rounded rattle rather than a piercing electronic tone.
          softNoise(.18,0,.42);softNoise(.16,.13,.36);softNoise(.14,.25,.31);softNoise(.11,.35,.25);
          tone(155,.12,.02,.30,"triangle",105);
          tone(205,.10,.15,.26,"triangle",135);
          tone(175,.09,.28,.22,"triangle",120);
          tone(230,.08,.38,.18,"triangle",145);
        }else if(kind==="move"){
          tone(610,.075,0,.095,"sine",545);
        }else if(kind==="capture"){
          tone(150,.12,0,.24,"sawtooth",75);tone(620,.10,.045,.18,"triangle",310);
        }else if(kind==="safe"){
          tone(880,.12,0,.16,"sine",1040);tone(1320,.18,.08,.13,"sine",1580);
        }else if(kind==="home"){
          tone(660,.13,0,.16,"sine",740);tone(880,.13,.10,.16,"sine",990);tone(1100,.22,.20,.17,"sine",1320);
        }else if(kind==="win"){
          tone(523,.18,0,.18,"sine",659);tone(659,.18,.16,.18,"sine",784);tone(784,.22,.32,.20,"sine",1047);tone(1047,.42,.50,.23,"sine",1319);
        }
        const end=kind==="win"?1.05:.52;
        master.gain.setValueAtTime(0.0001,now);master.gain.linearRampToValueAtTime(1.45,now+.006);master.gain.setValueAtTime(1.45,now+.02);master.gain.linearRampToValueAtTime(0.0001,now+end);
      }catch{}
    };
    const onAudio=(event:Event)=>{const value=String((event as CustomEvent).detail||"");if(["dice","move","capture","safe","home","win"].includes(value))play(value as SoundKind)};
    window.addEventListener("ludo-audio",onAudio);
    return()=>{window.removeEventListener("ludo-audio",onAudio);try{void ctxRef.current?.close()}catch{}ctxRef.current=null};
  },[]);
  return null;
}
