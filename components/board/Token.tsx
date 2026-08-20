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
  const sizeClass = resting
    ? "h-[122%] w-[122%] sm:h-[118%] sm:w-[118%]"
    : selectable
      ? "h-[92%] w-[92%]"
      : "h-[100%] w-[100%]";

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      aria-label={`${color} token`}
      className={[
        "absolute left-1/2 top-1/2 z-10 block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] sm:border-[4px] shadow-[0_3px_6px_rgba(0,0,0,.35)] transition-all duration-200 ease-out",
        sizeClass,
        selectable ? "ring-4 ring-white/90 cursor-pointer scale-105" : "cursor-default",
        COLOR_BG[color],
        COLOR_BORDER[color],
      ].join(" ")}
    >
      <span className="absolute top-[9%] left-[15%] aspect-square w-[34%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
