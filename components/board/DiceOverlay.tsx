"use client";

import { useEffect, useState } from "react";
import Die3D from "./Die3D";

// How long the centered "landing" flourish stays visible after a roll,
// before it fades out and the real interactive dice take over down in the
// holder (see Dice.tsx). Purely decorative - pointer-events-none for its
// entire life - so it can never block a tap on the board underneath it,
// unlike the old version of this component which doubled as the tap-to-
// choose UI and sat on top of the board the whole time a choice was
// pending.
const SPIN_MS = 550;
const FLOURISH_MS = 850;

interface DiceOverlayProps {
  /** Bumped on every new roll - restarts the flourish from scratch. */
  rollSeq: number;
  d1: number | null;
  d2: number | null;
}

export default function DiceOverlay({ rollSeq, d1, d2 }: DiceOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (rollSeq === 0) return;
    setVisible(true);
    setSpinning(true);
    const spinTimer = setTimeout(() => setSpinning(false), SPIN_MS);
    const hideTimer = setTimeout(() => setVisible(false), FLOURISH_MS);
    return () => {
      clearTimeout(spinTimer);
      clearTimeout(hideTimer);
    };
  }, [rollSeq]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="flex gap-3 bg-black/30 backdrop-blur-[2px] rounded-2xl p-3 shadow-2xl">
        <Die3D face={d1 ?? 1} spinning={spinning} size={56} />
        <Die3D face={d2 ?? 1} spinning={spinning} size={56} />
      </div>
    </div>
  );
}