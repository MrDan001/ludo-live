// Token/piece component
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
        "w-[70%] h-[70%] rounded-full border-2 shadow-sm",
        COLOR_BG[color],
        COLOR_BORDER[color],
        selectable ? "ring-2 ring-white cursor-pointer animate-pulse" : "cursor-default",
      ].join(" ")}
      aria-label={`${color} token`}
    />
  );
}