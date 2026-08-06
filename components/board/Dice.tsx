"use client";

import { useEffect, useState } from "react";
import Die3D from "./Die3D";

// Matches DiceOverlay's own spin+flourish timing - by the time the center
// flourish is fading out, this holder is ready to take over and show the
// real, tappable dice in their permanent spot.
const LANDED_DELAY_MS = 700;

interface DiceProps {
  onRoll: () => void;
  canRoll: boolean;
  /** True while the rolled dice are still "out" - either mid-flourish on
   *  the board or landed here waiting on a choice/resolution. Holder shows
   *  a disabled "Counting..." state (then the real dice) the whole time,
   *  only re-enabling once this goes false. */
  active: boolean;
  /** Bumped on every new roll - restarts the handoff timer below. Optional
   *  since the single-player /play page doesn't have a die-choice step and
   *  can leave this (and d1/d2/etc below) unset. */
  rollSeq?: number;
  d1?: number | null;
  d2?: number | null;
  /** True once rolled with two different usable values - the player must
   *  tap a die (shown here, once landed) to choose which to play. */
  needsChoice?: boolean;
  chosenValue?: number | null;
  onChooseValue?: (value: number) => void;
  /** Whether ANY valid move exists this roll, once landed. */
  hasValidMoves?: boolean;
}

export default function Dice({
  onRoll,
  canRoll,
  active,
  rollSeq = 0,
  d1 = null,
  d2 = null,
  needsChoice,
  chosenValue,
  onChooseValue,
  hasValidMoves,
}: DiceProps) {
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!active) {
      setLanded(false);
      return;
    }
    const t = setTimeout(() => setLanded(true), LANDED_DELAY_MS);
    return () => clearTimeout(t);
  }, [active, rollSeq]);

  const showResult = active && landed && d1 !== null && d2 !== null;

  const statusText = needsChoice
    ? "Tap a die to play"
    : chosenValue !== null && chosenValue !== undefined
    ? `Move: ${chosenValue}`
    : hasValidMoves
    ? "Waiting..."
    : "No valid moves";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {showResult ? (
        <div className="flex items-center gap-1.5">
          {[d1, d2].map((face, i) => (
            <button
              key={i}
              onClick={() => needsChoice && face !== null && onChooseValue?.(face)}
              disabled={!needsChoice}
              className={[
                "rounded-lg transition-transform",
                needsChoice ? "cursor-pointer active:scale-95 ring-2 ring-emerald-400/70 animate-pulse" : "cursor-default",
                chosenValue === face ? "ring-2 ring-white scale-105" : "",
              ].join(" ")}
            >
              <Die3D face={face ?? 1} size={32} />
            </button>
          ))}
        </div>
      ) : (
        <div
          className={[
            "flex items-center gap-0.5 px-1.5 h-10 rounded-lg border-2 transition-opacity",
            active ? "border-slate-600 opacity-30" : "border-amber-700 opacity-90",
          ].join(" ")}
        >
          <span className="text-base leading-none">🎲</span>
          <span className="text-base leading-none">🎲</span>
        </div>
      )}

      {showResult ? (
        <div className="text-white text-[10px] font-semibold bg-black/40 px-2 py-0.5 rounded-full text-center leading-tight whitespace-nowrap">
          {statusText}
        </div>
      ) : (
        <button
          onClick={onRoll}
          disabled={!canRoll}
          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform whitespace-nowrap"
        >
          {active ? "Counting..." : "Roll Dice"}
        </button>
      )}
    </div>
  );
}