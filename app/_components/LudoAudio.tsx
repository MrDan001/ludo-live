"use client";

import { useEffect, useRef } from "react";

type SoundKind = "dice" | "move" | "capture" | "safe" | "home" | "win";

/** Lightweight synthesized game SFX. No external audio assets are required. */
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
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.connect(ctx.destination);

        const tone = (freq:number, duration:number, start:number, gain:number, type:OscillatorType="sine", endFreq?:number) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, now + start);
          if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq), now + start + duration);
          g.gain.setValueAtTime(0.0001, now + start);
          g.gain.exponentialRampToValueAtTime(gain, now + start + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
          osc.connect(g); g.connect(master);
          osc.start(now + start); osc.stop(now + start + duration + 0.015);
        };

        if (kind === "dice") {
          // Louder, fuller roll that starts immediately when the roll event is emitted.
          tone(145, .18, 0, .32, "triangle", 88);
          tone(205, .16, .12, .27, "triangle", 115);
          tone(290, .14, .23, .25, "triangle", 150);
          tone(390, .11, .32, .22, "triangle", 205);
          tone(520, .08, .39, .18, "triangle", 275);
        } else if (kind === "move") {
          // Calm counting tick: deliberately softer and rounder than the old square click.
          tone(610, .075, 0, .095, "sine", 545);
        } else if (kind === "capture") {
          tone(150, .12, 0, .24, "sawtooth", 75);
          tone(620, .10, .045, .18, "triangle", 310);
        } else if (kind === "safe") {
          tone(880, .12, 0, .16, "sine", 1040);
          tone(1320, .18, .08, .13, "sine", 1580);
        } else if (kind === "home") {
          tone(660, .13, 0, .16, "sine", 740);
          tone(880, .13, .10, .16, "sine", 990);
          tone(1100, .22, .20, .17, "sine", 1320);
        } else if (kind === "win") {
          tone(523, .18, 0, .18, "sine", 659);
          tone(659, .18, .16, .18, "sine", 784);
          tone(784, .22, .32, .20, "sine", 1047);
          tone(1047, .42, .50, .23, "sine", 1319);
        }
        master.gain.setValueAtTime(0.0001, now);
        master.gain.linearRampToValueAtTime(1, now + 0.008);
        master.gain.setValueAtTime(1, now + .02);
        master.gain.linearRampToValueAtTime(0.0001, now + (kind === "win" ? 1.05 : .75));
      } catch {}
    };

    const onAudio = (event: Event) => {
      const value = String((event as CustomEvent).detail || "");
      if (["dice","move","capture","safe","home","win"].includes(value)) play(value as SoundKind);
    };
    window.addEventListener("ludo-audio", onAudio);
    return () => {
      window.removeEventListener("ludo-audio", onAudio);
      try { void ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
    };
  }, []);

  return null;
}
