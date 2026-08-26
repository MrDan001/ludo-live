"use client";
import React, { useMemo } from "react";
import LudoBoardGame, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardGame";
import { getTokenCell } from "../../lib/canonicalLudoBoard";
export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = {
  theme?: BoardThemeId;
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
  demoTokens?: DemoToken[];
  onTokenClick?: (color: DemoToken["color"], id: number) => void;
  snapOnUpdate?: boolean;
  finishSound?: boolean;
  animateUpdates?: boolean;
  legalTokenKeys?: string[];
};

const COLORS: DemoToken["color"][] = ["red", "yellow", "green", "blue"];
const STATIC_TOKENS: DemoToken[] = COLORS.flatMap((color) =>
  Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const }))
);

// The four yard token centers used by the canonical 15x15 board. These are
// deliberately kept here (multiplayer-only) so the reference boards remain
// untouched.
const YARD_CELLS: Record<DemoToken["color"], [number, number][]> = {
  green: [[2, 2], [2, 4], [4, 2], [4, 4]],
  yellow: [[2, 10], [2, 12], [4, 10], [4, 12]],
  red: [[10, 2], [10, 4], [12, 2], [12, 4]],
  blue: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

function tokenCell(token: DemoToken): [number, number] | null {
  if (token.position > 0) return getTokenCell(token.color, token.position);
  return YARD_CELLS[token.color]?.[token.id] ?? null;
}

/** Multiplayer-only board wrapper. The Bot-vs-Human and Tournament boards
 * are never modified. */
export default function LudoBoardMultiplayer({
  theme = "classic",
  preview = false,
  className = "",
  style,
  demoTokens = [],
  onTokenClick,
  snapOnUpdate = false,
  finishSound = false,
  animateUpdates = true,
  legalTokenKeys = [],
}: Props) {
  const normalizedTokens = useMemo(() => {
    const incoming = new Map(demoTokens.map((token) => [`${token.color}:${token.id}`, token]));
    return STATIC_TOKENS.map((staticToken) => incoming.get(`${staticToken.color}:${staticToken.id}`) ?? staticToken);
  }, [demoTokens]);

  const pulseTokens = useMemo(() => {
    const legal = new Set(legalTokenKeys);
    return normalizedTokens.filter((token) => legal.has(`${token.color}:${token.id}`) && token.state !== "finished");
  }, [normalizedTokens, legalTokenKeys]);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1" }} className={className}>
      <LudoBoardGame
        theme={theme}
        preview={preview}
        style={{ width: "100%", height: "100%", ...style }}
        demoTokens={normalizedTokens}
        onTokenClick={onTokenClick}
        snapOnUpdate={snapOnUpdate}
        finishSound={finishSound}
        animateUpdates={animateUpdates}
      />
      {pulseTokens.length > 0 && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 150 }}>
          {pulseTokens.map((token) => {
            const cell = tokenCell(token);
            if (!cell) return null;
            const [row, col] = cell;
            return (
              <span
                key={`pulse-${token.color}-${token.id}`}
                style={{
                  position: "absolute",
                  left: `${((col + 0.5) / 15) * 100}%`,
                  top: `${((row + 0.5) / 15) * 100}%`,
                  width: `${(0.72 / 15) * 100}%`,
                  aspectRatio: "1",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `2px solid ${BOARD_PALETTES[theme][token.color]}`,
                  boxShadow: `0 0 0 2px rgba(255,255,255,.9), 0 0 14px ${BOARD_PALETTES[theme][token.color]}`,
                  animation: "mp-token-breathe 1.25s ease-in-out infinite",
                }}
              />
            );
          })}
        </div>
      )}
      <style jsx>{`
        @keyframes mp-token-breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(.88); opacity: .62; }
          50% { transform: translate(-50%, -50%) scale(1.18); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; opacity: .95; }
        }
      `}</style>
    </div>
  );
}
