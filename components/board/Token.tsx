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
  // Keep tokens large enough to read on small screens while remaining centred
  // inside their square. The transform below centres the token itself, so the
  // larger resting token cannot become visually biased to one side.
  const sizeClass = selectable
    ? "h-[78%] w-[78%] sm:h-[72%] sm:w-[72%]"
    : resting
      ? "h-[108%] w-[108%] sm:h-[118%] sm:w-[118%]"
      : "h-[94%] w-[94%]";

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      aria-label={`${color} token`}
      className={[
        "absolute left-1/2 top-1/2 z-10 block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] shadow-xl transition-all duration-250 ease-out",
        sizeClass,
        selectable
          ? "ring-4 ring-white/80 cursor-pointer scale-95"
          : "cursor-default",
        COLOR_BG[color],
        COLOR_BORDER[color],
      ].join(" ")}
    >
      <span className="absolute top-[10%] left-[16%] aspect-square w-[36%] rounded-full bg-white/45 blur-[1px]" />
    </button>
  );
}
