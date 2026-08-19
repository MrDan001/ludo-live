"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BG, COLOR_BORDER } from "@/lib/engine/layout";

interface TokenProps {
  color: PlayerColor;
  selectable?: boolean;
  onClick?: () => void;
  resting?: boolean;
}

export default function Token({ color, selectable, onClick, resting = false }: TokenProps) {
  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      aria-label={`${color} token`}
      className={[
        "absolute left-1/2 top-1/2 z-10 block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] shadow-xl transition-transform duration-200",
        resting ? "h-[88%] w-[88%]" : "h-[78%] w-[78%]",
        selectable
          ? "ring-4 ring-white/80 cursor-pointer animate-bounce"
          : "cursor-default",
        COLOR_BG[color],
        COLOR_BORDER[color],
      ].join(" ")}
    >
      <span className="absolute top-[10%] left-[16%] aspect-square w-[36%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
