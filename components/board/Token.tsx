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
  const sizeClass = selectable
    ? "h-[82%] w-[82%] sm:h-[78%] sm:w-[78%]"
    : resting
      ? "h-[76%] w-[76%] sm:h-[72%] sm:w-[72%]"
      : "h-[92%] w-[92%]";

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      aria-label={`${color} token`}
      className={[
        "absolute left-1/2 top-1/2 z-10 block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] sm:border-[4px] shadow-xl transition-all duration-200 ease-out",
        sizeClass,
        selectable ? "ring-4 ring-white/80 cursor-pointer" : "cursor-default",
        COLOR_BG[color],
        COLOR_BORDER[color],
      ].join(" ")}
    >
      <span className="absolute top-[10%] left-[16%] aspect-square w-[36%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
