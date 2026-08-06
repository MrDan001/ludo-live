"use client";

import { useEffect, useState } from "react";
import Die3D from "./Die3D";

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
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (rollSeq === 0) return;
    setSpinning(true);
    const t = setTimeout(() => setSpinning(false), 550);
    return () => clearTimeout(t);
  }, [rollSeq]);

  return (
    <button
      key={rollSeq}
      onClick={onChoose}
      disabled={!selectable}
      className={[
        "rounded-xl transition-transform",
        selectable ? "cursor-pointer active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-xl transition-all",
          selectable ? "ring-4 ring-emerald-400/60 animate-pulse" : "",
          chosen ? "ring-4 ring-white scale-110" : "",
        ].join(" ")}
      >
        <Die3D face={finalFace} spinning={spinning} size={56} />
      </div>
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
  /** Whether ANY valid move exists this roll, for anyone - independent of
   *  whether it's been resolved on THIS particular screen yet. Without
   *  this, a spectating player (not the one rolling) would wrongly see
   *  "No valid moves" the whole time the actual roller is still deciding,
   *  since chosenValue only ever resolves on the acting player's screen. */
  hasValidMoves?: boolean;
}

export default function DiceOverlay({
  active,
  d1,
  d2,
  rollSeq,
  needsChoice,
  chosenValue,
  onChooseValue,
  hasValidMoves,
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
        ) : hasValidMoves ? (
          <div className="text-white text-xs bg-black/50 px-2.5 py-0.5 rounded-full text-slate-300">
            Waiting for their move...
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