"use client";
import React from "react";
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

/**
 * Multiplayer intentionally uses the same board implementation as Bot vs Human.
 * Keep this wrapper multiplayer-only: the Bot vs Human board remains untouched.
 * Server/socket state is still owned by MultiplayerGameCanonical.
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
  return (
    <LudoBoardGame
      theme={theme}
      preview={preview}
      className={className}
      style={style}
      demoTokens={demoTokens}
      onTokenClick={onTokenClick}
      snapOnUpdate={snapOnUpdate}
      finishSound={finishSound}
      animateUpdates={animateUpdates}
    />
  );
}
