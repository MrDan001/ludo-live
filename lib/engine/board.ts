// Ludo board layout, path coordinates, safe zones

import { PlayerColor, ALL_COLORS } from "./gameState";

// Standard Ludo board: 52 shared squares arranged in a loop.
// Each color enters the loop at its own start offset.
export const GLOBAL_PATH_LENGTH = 52;

export const START_OFFSET: Record<PlayerColor, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

// Converts a token's relative position (0-51) into its actual square
// on the shared 52-square loop, based on its color's start offset.
export function relativeToGlobal(color: PlayerColor, relativePos: number): number {
  return (START_OFFSET[color] + relativePos) % GLOBAL_PATH_LENGTH;
}

// Safe squares: each color's start square, plus a star square 8 steps
// further along the shared path. No captures happen here.
export function getSafeGlobalSquares(): Set<number> {
  const safe = new Set<number>();
  for (const color of ALL_COLORS) {
    safe.add(START_OFFSET[color]);
    safe.add((START_OFFSET[color] + 8) % GLOBAL_PATH_LENGTH);
  }
  return safe;
}

export function isGlobalSquareSafe(globalSquare: number): boolean {
  return getSafeGlobalSquares().has(globalSquare);
}
