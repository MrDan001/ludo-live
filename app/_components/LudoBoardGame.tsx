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

const finishedOrder = ["green", "yellow", "red", "blue"] as const;

export default function LudoBoardGame({ theme = "classic", preview = false, className = "", style, demoTokens = [], onTokenClick }: Props) {
  const finished = finishedOrder.flatMap(color =>
    demoTokens
      .filter(t => t.color === color && t.state === "finished")
      .sort((a, b) => a.id - b.id)
      .map(t => ({ ...t, color }))
  );

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
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(3, 1fr)",
          gap: "1%", padding: "5%", boxSizing: "border-box", placeItems: "center",
          pointerEvents: "none", zIndex: 20, overflow: "hidden",
        }}
      >
        {finished.map(t => (
          <div key={`${t.color}-${t.id}`} style={{
            width: "90%", height: "90%", minWidth: 0, minHeight: 0,
            borderRadius: "50%", background: t.color,
            border: "1px solid rgba(255,255,255,.95)",
            boxShadow: "0 2px 5px rgba(0,0,0,.35)",
          }} />
        ))}
      </div>
    </div>
  );
}
