"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BG, COLOR_BORDER } from "@/lib/engine/layout";

interface TokenProps {
  color: PlayerColor;
  selectable?: boolean;
  onClick?: () => void;
  /** Tokens in the yard are at rest and should read larger than moving tokens. */
  resting?: boolean;
}

export default function Token({ color, selectable, onClick, resting = false }: TokenProps) {
  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={[
        "relative rounded-full border-[3px] shadow-lg transition-transform duration-200",
        resting ? "w-[112%] h-[112%]" : "w-[100%] h-[100%]",
        COLOR_BG[color],
        COLOR_BORDER[color],
        selectable
          ? "ring-4 ring-white/80 cursor-pointer animate-bounce scale-110"
          : "cursor-default",
      ].join(" ")}
      aria-label={`${color} token`}
    >
      <span className="absolute top-[12%] left-[18%] w-[34%] h-[34%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
