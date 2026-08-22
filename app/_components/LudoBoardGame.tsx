"use client";
import React, { useEffect, useState } from "react";
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

// The shop catalog has a dedicated Midnight Live id while the board renderer
// uses the existing Night City visual palette for that skin.
const resolveEquippedTheme = (value: unknown, fallback: BoardThemeId): BoardThemeId => {
  const id = String(value || "");
  if (id === "midnight-live") return "night";
  return id in BOARD_PALETTES ? id as BoardThemeId : fallback;
};

export default function LudoBoardGame({ theme = "classic", preview = false, className = "", style, demoTokens = [], onTokenClick }: Props) {
  const [activeTheme, setActiveTheme] = useState<BoardThemeId>(theme);

  // The equipped board belongs to the signed-in player. Resolve it here so
  // both the local board and the multiplayer board use the same customization
  // source instead of depending on a stale page-level localStorage value.
  useEffect(() => {
    let active = true;
    const loadEquippedBoard = async () => {
      try {
        const response = await fetch("/api/customization", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setActiveTheme(resolveEquippedTheme(data?.equippedBoard, theme));
      } catch {
        // Keep the supplied board theme when customization is unavailable.
      }
    };
    loadEquippedBoard();
    return () => { active = false; };
  }, [theme]);

  useEffect(() => {
    // Keep the component responsive if the parent changes its room/preview
    // theme while the customization request is still pending.
    setActiveTheme(current => resolveEquippedTheme(current, theme));
  }, [theme]);

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
        theme={activeTheme}
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
          const color = BOARD_PALETTES[activeTheme]?.[t.color] || BOARD_PALETTES.classic[t.color];
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
