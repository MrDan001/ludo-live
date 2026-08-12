"use client";

import { MoveSource } from "@/lib/engine/moves";

const TABS: { source: MoveSource; label: string; bg: string; ring: string }[] = [
  { source: "d1", label: "Blue", bg: "bg-sky-500", ring: "ring-sky-300" },
  { source: "sum", label: "Red", bg: "bg-red-600", ring: "ring-red-300" },
  { source: "d2", label: "Green", bg: "bg-emerald-500", ring: "ring-emerald-300" },
];

interface DiceProps {
  /** Null until a roll has landed this turn. */
  roll: { d1: number; d2: number; sum: number } | null;
  /** Which tab is currently chosen (or auto-chosen when only one has
   *  moves). Null while the player still needs to tap one. */
  activeSource: MoveSource | null;
  /** Whether each source has at least one legal move this roll - a tab
   *  with none is shown but disabled, same as real Ludo (e.g. you rolled
   *  a 3 on Blue but every token would overshoot home on that value). */
  sourceEnabled: Record<MoveSource, boolean>;
  onSelect: (source: MoveSource) => void;
  /** True once the tabs shouldn't be tappable at all - not your turn, or
   *  no roll landed yet. */
  disabled?: boolean;
}

/** The three permanent Blue / Red / Green tabs below the board. Blue plays
 *  die 1's value, Green plays die 2's value, Red plays the combined
 *  d1+d2 value as a single jump. Tapping a tab commits to that move set -
 *  only tokens with a legal move under the chosen tab become selectable
 *  on the board. */
export default function Dice({ roll, activeSource, sourceEnabled, onSelect, disabled }: DiceProps) {
  const valueFor = (source: MoveSource): number => {
    if (!roll) return 0;
    if (source === "d1") return roll.d1;
    if (source === "d2") return roll.d2;
    return roll.sum;
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {TABS.map(({ source, label, bg, ring }) => {
        const enabled = !disabled && !!roll && sourceEnabled[source];
        const isActive = activeSource === source;
        return (
          <button
            key={source}
            type="button"
            onClick={() => enabled && onSelect(source)}
            disabled={!enabled}
            aria-label={`${label} move`}
            style={{ width: "min(19vw, 80px)", height: "min(19vw, 80px)", fontSize: "min(7.5vw, 32px)" }}
            className={[
              "relative rounded-full flex items-center justify-center text-white font-extrabold shadow-[inset_0_3px_4px_rgba(255,255,255,0.55),0_4px_8px_rgba(0,0,0,0.55)] border-[3px] border-black/25 transition-all",
              bg,
              enabled ? "opacity-100 active:scale-95" : "opacity-35 grayscale cursor-not-allowed",
              isActive ? `ring-4 ${ring} scale-110` : "",
            ].join(" ")}
          >
            {valueFor(source)}
          </button>
        );
      })}
    </div>
  );
}
