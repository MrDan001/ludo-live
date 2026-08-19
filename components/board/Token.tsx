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
      className={[
        "relative aspect-square rounded-full border-[4px] shadow-xl transition-transform duration-200",
        "w-full h-auto max-w-full",
        resting ? "scale-[1.18]" : "scale-[1.05]",
        COLOR_BG[color],
        COLOR_BORDER[color],
        selectable
          ? "ring-4 ring-white/80 cursor-pointer animate-bounce scale-[1.12]"
          : "cursor-default",
      ].join(" ")}
      aria-label={`${color} token`}
    >
      <span className="absolute top-[10%] left-[16%] w-[36%] aspect-square rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
