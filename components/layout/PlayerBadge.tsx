"use client";

import { PlayerColor } from "@/lib/engine";
import { COLOR_BORDER } from "@/lib/engine/layout";

interface PlayerBadgeProps {
  name: string;
  color: PlayerColor;
  isCurrentTurn: boolean;
  connected: boolean;
  empty?: boolean;
  avatarUrl?: string;
}

export default function PlayerBadge({ name, color, isCurrentTurn, connected, empty, avatarUrl }: PlayerBadgeProps) {
  if (empty) {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/80 border-2 border-dashed border-slate-500 shadow-lg">
        <span className="text-slate-300 text-lg leading-none">+</span>
      </div>
    );
  }

  return (
    <div
      className={[
        "flex items-center gap-1.5 bg-slate-800/95 rounded-full pl-1 pr-3 py-1 shadow-lg border-2 transition-shadow",
        isCurrentTurn ? "border-amber-400 shadow-amber-400/30 shadow-[0_0_10px_2px]" : "border-slate-700",
        !connected ? "opacity-50" : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative w-7 h-7 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold border-2",
          COLOR_BORDER[color],
        ].join(" ")}
        style={{
          background:
            color === "RED" ? "#ef4444" : color === "GREEN" ? "#10b981" : color === "YELLOW" ? "#eab308" : "#3b82f6",
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <span className="text-white text-xs font-semibold max-w-[64px] truncate">{name}</span>
      {isCurrentTurn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
    </div>
  );
}