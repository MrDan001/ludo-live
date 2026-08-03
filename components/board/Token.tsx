"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BG, COLOR_BORDER } from "@/lib/engine/layout";

interface TokenProps {
  color: PlayerColor;
  selectable?: boolean;
  onClick?: () => void;
}

export default function Token({ color, selectable, onClick }: TokenProps) {
  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={[
        "relative w-[72%] h-[72%] rounded-full border-2 shadow-md transition-transform",
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