"use client";

import { useEffect, useState } from "react";

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DiceFace({ face }: { face: number }) {
  const pips = PIP_LAYOUTS[face] || [];
  const pipSet = new Set(pips.map(([r, c]) => `${r},${c}`));

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const active = pipSet.has(`${r},${c}`);
        return (
          <div key={i} className="flex items-center justify-center">
            {active && <div className="w-2 h-2 rounded-full bg-slate-900" />}
          </div>
        );
      })}
    </div>
  );
}

function SingleDie({ finalFace, rollSeq }: { finalFace: number; rollSeq: number }) {
  const [face, setFace] = useState(finalFace);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (rollSeq === 0) return;
    setSpinning(true);
    let ticks = 0;
    const maxTicks = 9;
    const interval = setInterval(() => {
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setFace(finalFace);
        setSpinning(false);
      } else {
        setFace(Math.floor(Math.random() * 6) + 1);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [rollSeq, finalFace]);

  return (
    <div
      key={rollSeq}
      className={[
        "w-14 h-14 rounded-lg bg-white border-2 border-slate-800 shadow-md",
        spinning ? "animate-dice-tumble" : "",
      ].join(" ")}
    >
      <DiceFace face={face} />
    </div>
  );
}

interface DiceProps {
  d1: number | null;
  d2: number | null;
  rollSeq: number;
  onRoll: () => void;
  canRoll: boolean;
}

export default function Dice({ d1, d2, rollSeq, onRoll, canRoll }: DiceProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        <SingleDie finalFace={d1 ?? 1} rollSeq={rollSeq} />
        <SingleDie finalFace={d2 ?? 1} rollSeq={rollSeq} />
      </div>
      {d1 !== null && d2 !== null && (
        <div className="text-white text-sm">Total: {d1 + d2}</div>
      )}
      <button
        onClick={onRoll}
        disabled={!canRoll}
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        Roll Dice
      </button>
    </div>
  );
}