"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BG, COLOR_BORDER } from "@/lib/engine/layout";

interface TokenProps {
  color: PlayerColor;
  selectable?: boolean;
  onClick?: () => void;
  /** How many tokens are sharing this same cell right now - bigger when
   *  alone, scaled down just enough to still fit when stacked. */
  stackSize?: number;
}

// Percent of the cell's own box (not the board cell) each token occupies,
// keyed by how many tokens currently share that cell.
const SIZE_BY_STACK: Record<number, string> = {
  1: "88%",
  2: "68%",
  3: "56%",
  4: "48%",
};

export default function Token({ color, selectable, onClick, stackSize = 1 }: TokenProps) {
  const size = SIZE_BY_STACK[Math.min(stackSize, 4)] ?? SIZE_BY_STACK[4];

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      style={{ width: size, height: size }}
      className={[
        "relative rounded-full border-2 shadow-md transition-transform",
        COLOR_BG[color],
        COLOR_BORDER[color],
        selectable
          ? "ring-4 ring-white/80 cursor-pointer animate-bounce scale-110"
          : "cursor-default",
      ].join(" ")}
      aria-label={`${color} token`}
    >
      {/* shine highlight */}
      <span className="absolute top-[15%] left-[20%] w-[35%] h-[35%] rounded-full bg-white/40 blur-[1px]" />
    </button>
  );
}