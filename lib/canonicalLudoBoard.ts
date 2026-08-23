import type { LudoColor as MovementLudoColor } from "./ludoMovement";

export type LudoColor = MovementLudoColor;
export type BoardCell = readonly [number, number];

// Canonical tournament movement: 50 shared-path positions, then the first
// coloured home-lane position is progress 51. The centre finish is progress 56.
// The physical board has 52 shared cells; each colour's route intentionally
// uses the first 50 cells from its start and skips the final two approach cells
// before entering that colour's home lane, matching the board layout.
export const TRACK_LENGTH = 50;
export const HOME_STRETCH = 5;
export const YARD_PROGRESS = 0;
export const TRACK_START_PROGRESS = 1;
export const HOME_START_PROGRESS = 51;
export const FINISH_PROGRESS = 56;
export const PHYSICAL_TRACK_LENGTH = 52;

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
  // Use the real 52-cell physical track for coordinate lookup. The movement
  // rule still stops at progress 50, so the final two physical approach cells
  // are skipped and progress 51 enters the colour's home lane.
  const index = (START_INDEX[color] + progress - 1) % PHYSICAL_TRACK_LENGTH;
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

if (MAIN_PATH.length !== PHYSICAL_TRACK_LENGTH || new Set(MAIN_PATH.map(([r, c]) => `${r}:${c}`)).size !== PHYSICAL_TRACK_LENGTH) {
  throw new Error(`Canonical Ludo invariant failed: expected ${PHYSICAL_TRACK_LENGTH} unique physical shared cells.`);
}
