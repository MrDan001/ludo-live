"use client";

interface DiceProps {
  onRoll: () => void;
  canRoll: boolean;
  /** True while the rolled dice are out landed on the board (see
   *  DiceOverlay) - holder shows an idle icon and the button is disabled
   *  the whole time, only re-enabling once they've retracted. */
  active: boolean;
}

export default function Dice({ onRoll, canRoll, active }: DiceProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={[
          "flex items-center gap-0.5 px-1.5 h-10 rounded-lg border-2 transition-opacity",
          active ? "border-slate-600 opacity-30" : "border-amber-700 opacity-90",
        ].join(" ")}
      >
        <span className="text-base leading-none">🎲</span>
        <span className="text-base leading-none">🎲</span>
      </div>
      <button
        onClick={onRoll}
        disabled={!canRoll}
        className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform whitespace-nowrap"
      >
        {active ? "Counting..." : "Roll Dice"}
      </button>
    </div>
  );
}