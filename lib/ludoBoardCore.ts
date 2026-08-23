// Single source of truth for the physical Ludo board geometry.
// Themes may change appearance, but must never redefine movement geometry.

import type { LudoColor } from "./ludoMovement";

export type BoardCell = readonly [number, number];

export const TRACK_LENGTH = 52;
export const PLAYABLE_TRACK_LENGTH = TRACK_LENGTH;
export const HOME_STRETCH = 5;
// A token traverses all 52 shared-track cells, then enters its five coloured
// home-lane cells. The sixth finishing position is the centre finish box.
export const HOME_ENTRY_STEP = PLAYABLE_TRACK_LENGTH;

export const START_INDEX: Record<LudoColor, number> = {
  green: 0,
  yellow: 13,
  blue: 26,
  red: 39,
};

export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47] as const;

export const MAIN_PATH: readonly BoardCell[] = [
  ...Array.from({ length: 5 }, (_, i) => [6, i + 1] as const),
  ...Array.from({ length: 6 }, (_, i) => [5 - i, 6] as const),
  [0, 7], [0, 8],
  ...Array.from({ length: 5 }, (_, i) => [i + 1, 8] as const),
  ...Array.from({ length: 6 }, (_, i) => [6, i + 9] as const),
  [7, 14], [8, 14],
  ...Array.from({ length: 5 }, (_, i) => [8, 13 - i] as const),
  ...Array.from({ length: 6 }, (_, i) => [9 + i, 8] as const),
  [14, 7], [14, 6],
  ...Array.from({ length: 5 }, (_, i) => [13 - i, 6] as const),
  ...Array.from({ length: 6 }, (_, i) => [8, 5 - i] as const),
  [7, 0], [6, 0],
];

export const HOME_LANES: Record<LudoColor, readonly BoardCell[]> = {
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

export const SAFE_CELLS = [
  { row: 6, col: 1, color: "green" },
  { row: 1, col: 8, color: "yellow" },
  { row: 13, col: 6, color: "red" },
  { row: 8, col: 13, color: "blue" },
] as const;

export function getTrackCell(color: LudoColor, steps: number): BoardCell | null {
  if (steps < 0 || steps >= PLAYABLE_TRACK_LENGTH) return null;
  const rotatedPath = [...MAIN_PATH.slice(START_INDEX[color]), ...MAIN_PATH.slice(0, START_INDEX[color])];
  return rotatedPath[steps] ?? null;
}

export function getHomeCell(color: LudoColor, steps: number): BoardCell | null {
  const index = steps - HOME_ENTRY_STEP;
  return index >= 0 && index < HOME_STRETCH ? HOME_LANES[color][index] ?? null : null;
}

export function getTokenCell(color: LudoColor, steps: number): BoardCell | null {
  return steps < HOME_ENTRY_STEP ? getTrackCell(color, steps) : getHomeCell(color, steps);
}

if (MAIN_PATH.length !== TRACK_LENGTH) {
  throw new Error(`Ludo board invariant failed: expected ${TRACK_LENGTH} track cells, got ${MAIN_PATH.length}.`);
}
for (const color of ["green", "yellow", "blue", "red"] as LudoColor[]) {
  if (HOME_LANES[color].length !== HOME_STRETCH) {
    throw new Error(`Ludo board invariant failed: ${color} home lane must contain ${HOME_STRETCH} cells.`);
  }
}
