"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BG, COLOR_BORDER } from "@/lib/engine/layout";

interface TokenProps {
  color: PlayerColor;
  selectable?: boolean;
  onClick?: () => void;
  /** Tokens in the yard are at rest and intentionally read very large. */
  resting?: boolean;
}

export default function Token({ color, selectable, onClick, resting = false }: TokenProps) {
  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={[
        "relative rounded-full border-[4px] shadow-xl transition-transform duration-200",
        resting ? "w-[150%] h-[150%]" : "w-[125%] h-[125%]",
        COLOR_BG[color],
        COLOR_BORDER[color],
        selectable
          ? "ring-4 ring-white/80 cursor-pointer animate-bounce scale-110"
          : "cursor-default",
      ].join(" ")}
      aria-label={`${color} token`}
    >
      <span className="absolute top-[10%] left-[16%] w-[36%] h-[36%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
