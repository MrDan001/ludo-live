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

function SingleDie({
  finalFace,
  rollSeq,
  selectable,
  chosen,
  onChoose,
}: {
  finalFace: number;
  rollSeq: number;
  selectable?: boolean;
  chosen?: boolean;
  onChoose?: () => void;
}) {
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
    <button
      key={rollSeq}
      onClick={onChoose}
      disabled={!selectable}
      className={[
        "w-14 h-14 rounded-lg bg-white border-2 shadow-xl transition-transform",
        spinning ? "animate-dice-tumble" : "",
        selectable ? "border-emerald-400 ring-4 ring-emerald-400/50 cursor-pointer active:scale-95 animate-pulse" : "border-slate-800",
        chosen ? "ring-4 ring-white scale-110 border-emerald-500" : "",
      ].join(" ")}
    >
      <DiceFace face={face} />
    </button>
  );
}

interface DiceOverlayProps {
  /** Whether the dice should currently be shown, landed, on the board -
   *  driven by the room's `lastRoll` (see useMultiplayerGame). Stays true
   *  through the whole step-by-step move animation and only goes false
   *  once that's finished (or, if nothing to animate, after a short
   *  grace period) - so the dice hold their spot the whole time. */
  active: boolean;
  d1: number | null;
  d2: number | null;
  rollSeq: number;
  /** True once rolled with two different usable values - the player must
   *  tap one die to choose which value to play (they're never summed). */
  needsChoice?: boolean;
  chosenValue?: number | null;
  onChooseValue?: (value: number) => void;
}

export default function DiceOverlay({
  active,
  d1,
  d2,
  rollSeq,
  needsChoice,
  chosenValue,
  onChooseValue,
}: DiceOverlayProps) {
  // Keep rendering briefly after `active` goes false so the retract
  // animation actually gets to play, instead of vanishing instantly.
  const [mounted, setMounted] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [active]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div
        className={[
          "flex flex-col items-center gap-2 transition-all duration-200",
          active ? "opacity-100 scale-100" : "opacity-0 scale-75",
        ].join(" ")}
      >
        <div className="flex gap-3 bg-black/30 backdrop-blur-[2px] rounded-2xl p-3 shadow-2xl pointer-events-auto">
          <SingleDie
            finalFace={d1 ?? 1}
            rollSeq={rollSeq}
            selectable={needsChoice}
            chosen={chosenValue === d1}
            onChoose={() => d1 !== null && onChooseValue?.(d1)}
          />
          <SingleDie
            finalFace={d2 ?? 1}
            rollSeq={rollSeq}
            selectable={needsChoice}
            chosen={chosenValue === d2}
            onChoose={() => d2 !== null && onChooseValue?.(d2)}
          />
        </div>
        {needsChoice ? (
          <div className="text-white text-xs font-bold bg-black/50 px-2.5 py-0.5 rounded-full animate-pulse">
            Tap a die to choose which to play
          </div>
        ) : chosenValue !== null && chosenValue !== undefined ? (
          <div className="text-white text-sm font-bold bg-black/50 px-2.5 py-0.5 rounded-full">
            Move: {chosenValue}
          </div>
        ) : (
          d1 !== null &&
          d2 !== null && (
            <div className="text-white text-xs bg-black/50 px-2.5 py-0.5 rounded-full text-slate-300">
              No valid moves
            </div>
          )
        )}
      </div>
    </div>
  );
}