"use client";
import React from "react";
import BaseBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardFixed";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = {
  theme?: BoardThemeId;
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
  demoTokens?: DemoToken[];
  onTokenClick?: (color: DemoToken["color"], id: number) => void;
};

// Finished tokens are deliberately ordered by colour so the centre always
// shows a clear, predictable colour grouping: green, yellow, red, blue.
const finishedOrder = ["green", "yellow", "red", "blue"] as const;

export default function LudoBoardGame({ theme = "classic", preview = false, className = "", style, demoTokens = [], onTokenClick }: Props) {
  const finished = finishedOrder.flatMap(color =>
    demoTokens
      .filter(t => t.color === color && t.state === "finished")
      .sort((a, b) => a.id - b.id)
      .map(t => ({ ...t, color }))
  );

  // A finished token must NEVER be passed to the base board renderer. This
  // prevents it from being rendered back in its original yard position.
  const boardTokens = demoTokens.filter(t => t.state !== "finished");

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", ...style }} className={className}>
      <BaseBoard
        theme={theme}
        preview={preview}
        demoTokens={boardTokens}
        onTokenClick={onTokenClick}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        aria-label={`Finished tokens: ${finished.length}`}
        style={{
          position: "absolute", left: "40%", top: "40%", width: "20%", height: "20%",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(4, 1fr)",
          placeItems: "center", padding: "4%", gap: "1%", boxSizing: "border-box", zIndex: 20,
          pointerEvents: "none",
        }}
      >
        {finished.map((t, index) => {
          const color = BOARD_PALETTES[theme]?.[t.color] || BOARD_PALETTES.classic[t.color];
          return <span
            key={`${t.color}-${t.id}`}
            aria-label={`${t.color} finished token ${t.id + 1}`}
            style={{
              width: "92%", aspectRatio: "1", borderRadius: "50%",
              background: color,
              border: "1.5px solid rgba(20,20,20,.8)",
              boxShadow: "0 1px 2px rgba(0,0,0,.3)",
              gridColumn: (index % 4) + 1,
              gridRow: Math.floor(index / 4) + 1,
            }}
          />;
        })}
      </div>
    </div>
  );
}
