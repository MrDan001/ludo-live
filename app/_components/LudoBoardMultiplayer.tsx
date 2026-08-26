"use client";
import React, { useMemo } from "react";
import LudoBoardGame, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardGame";
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
  Array.from({ length: 4 }, (_, id) => ({
    color,
    id,
    position: 0,
    state: "yard" as const,
  }))
);

/** Multiplayer-only board wrapper. The Bot vs Human and Tournament boards are
 * intentionally left untouched. Multiplayer supplies live token state while
 * the shared board renderer provides the proven visual/movement presentation.
 */
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
}: Props) {
  const normalizedTokens = useMemo(() => {
    const incoming = new Map(demoTokens.map((token) => [`${token.color}:${token.id}`, token]));
    return STATIC_TOKENS.map((staticToken) => {
      const token = incoming.get(`${staticToken.color}:${staticToken.id}`);
      return token ?? staticToken;
    });
  }, [demoTokens]);

  return (
    <LudoBoardGame
      theme={theme}
      preview={preview}
      className={className}
      style={style}
      demoTokens={normalizedTokens}
      onTokenClick={onTokenClick}
      snapOnUpdate={snapOnUpdate}
      finishSound={finishSound}
      animateUpdates={animateUpdates}
    />
  );
}
