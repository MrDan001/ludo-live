import type { LudoColor } from "./ludoMovement";

export type BoardCell = readonly [number, number];

export const TRACK_LENGTH = 52;
export const HOME_STRETCH = 5;
export const YARD_PROGRESS = 0;
export const TRACK_START_PROGRESS = 1;
export const HOME_START_PROGRESS = TRACK_LENGTH + 1; // 53
export const FINISH_PROGRESS = TRACK_LENGTH + HOME_STRETCH + 1; // 58

export const START_INDEX: Record<LudoColor, number> = {
  green: 0,
  yellow: 13,
  blue: 26,
  red: 39,
};

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

export function getTrackCell(color: LudoColor, progress: number): BoardCell | null {
  if (progress < TRACK_START_PROGRESS || progress > TRACK_LENGTH) return null;
  const index = (START_INDEX[color] + progress - 1) % TRACK_LENGTH;
  return MAIN_PATH[index] ?? null;
}

export function getHomeCell(color: LudoColor, progress: number): BoardCell | null {
  const index = progress - HOME_START_PROGRESS;
  return index >= 0 && index < HOME_STRETCH ? HOME_LANES[color][index] ?? null : null;
}

export function getTokenCell(color: LudoColor, progress: number): BoardCell | null {
  if (progress >= TRACK_START_PROGRESS && progress <= TRACK_LENGTH) return getTrackCell(color, progress);
  if (progress >= HOME_START_PROGRESS && progress < FINISH_PROGRESS) return getHomeCell(color, progress);
  return null;
}

export function tokenState(progress: number): "yard" | "track" | "home" | "finished" {
  if (progress <= YARD_PROGRESS) return "yard";
  if (progress <= TRACK_LENGTH) return "track";
  if (progress < FINISH_PROGRESS) return "home";
  return "finished";
}

if (MAIN_PATH.length !== TRACK_LENGTH || new Set(MAIN_PATH.map(([r, c]) => `${r}:${c}`)).size !== TRACK_LENGTH) {
  throw new Error(`Canonical Ludo invariant failed: expected ${TRACK_LENGTH} unique shared cells.`);
}
