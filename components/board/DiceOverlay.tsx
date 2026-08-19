"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Die3D from "./Die3D";

// Give the dice enough time to visibly complete multiple 360-degree turns
// before the authoritative result is allowed to settle onto the final face.
const SPIN_MS = 900;

interface DiceOverlayProps {
  onRoll: () => void;
  canRoll: boolean;
  rollSeq: number;
  d1: number | null;
  d2: number | null;
}

export default function DiceOverlay({ onRoll, canRoll, rollSeq, d1, d2 }: DiceOverlayProps) {
  const trayRef = useRef<HTMLButtonElement>(null);
  const [trayPx, setTrayPx] = useState(0);

  useLayoutEffect(() => {
    const el = trayRef.current;
    if (!el) return;
    const measure = () => setTrayPx(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [seenRollSeq, setSeenRollSeq] = useState(rollSeq);
  const [spinning, setSpinning] = useState(false);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);

  if (rollSeq !== seenRollSeq) {
    setSeenRollSeq(rollSeq);
    setSpinning(true);
    setHasRolledOnce(true);
  }

  useEffect(() => {
    if (rollSeq === 0) return;
    const t = setTimeout(() => setSpinning(false), SPIN_MS);
    return () => clearTimeout(t);
  }, [rollSeq]);

  const faceOrPlaceholder = (face: number | null) => face ?? 1;
  const dieSize = trayPx > 0 ? Math.round(trayPx * 0.42) : 20;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <button
        ref={trayRef}
        type="button"
        onClick={() => canRoll && onRoll()}
        disabled={!canRoll}
        aria-label="Roll dice"
        className={[
          "pointer-events-auto relative flex items-center justify-center gap-[8%] rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] border-2 transition-transform active:scale-95",
          canRoll ? "border-amber-400/70 cursor-pointer" : "border-amber-900/60 cursor-default",
          !hasRolledOnce && canRoll ? "animate-pulse" : "",
        ].join(" ")}
        style={{
          width: "19%",
          aspectRatio: "1 / 1",
          background: "radial-gradient(circle at 35% 30%, #2f7db0, #1a4c6e 70%)",
        }}
      >
        <Die3D face={faceOrPlaceholder(d1)} spinning={spinning} size={dieSize} />
        <Die3D face={faceOrPlaceholder(d2)} spinning={spinning} size={dieSize} />
      </button>
    </div>
  );
}
