"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BORDER } from "@/lib/engine/layout";

interface PlayerBadgeProps {
  name: string;
  color: PlayerColor;
  isCurrentTurn: boolean;
  connected: boolean;
}

export default function PlayerBadge({ name, color, isCurrentTurn, connected }: PlayerBadgeProps) {
  return (
    <div
      className={[
        "flex items-center gap-1.5 bg-slate-800/95 rounded-full pl-1 pr-3 py-1 shadow-lg border-2",
        isCurrentTurn ? "border-amber-400" : "border-slate-700",
        !connected ? "opacity-50" : "",
      ].join(" ")}
    >
      <div
        className={[
          "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2",
          COLOR_BORDER[color],
        ].join(" ")}
        style={{
          background:
            color === "RED" ? "#ef4444" : color === "GREEN" ? "#10b981" : color === "YELLOW" ? "#eab308" : "#3b82f6",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="text-white text-xs font-semibold max-w-[64px] truncate">{name}</span>
      {isCurrentTurn && <span className="text-amber-400 text-xs">●</span>}
    </div>
  );
}