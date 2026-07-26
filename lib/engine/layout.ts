import { PlayerColor, ALL_COLORS } from "./gameState";
import { GLOBAL_PATH_LENGTH, relativeToGlobal, getSafeGlobalSquares } from "./board";

export interface Coord {
  row: number;
  col: number;
}

// The 52 shared-path squares, in board order, index 0-51.
// Index 0 = RED's entry square, matching START_OFFSET in board.ts.
export const GLOBAL_PATH_COORDS: Coord[] = [
  { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 },
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 }, { row: 1, col: 8 }, { row: 2, col: 8 }, { row: 3, col: 8 }, { row: 4, col: 8 }, { row: 5, col: 8 },
  { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 }, { row: 6, col: 13 }, { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 }, { row: 8, col: 13 }, { row: 8, col: 12 }, { row: 8, col: 11 }, { row: 8, col: 10 }, { row: 8, col: 9 },
  { row: 9, col: 8 }, { row: 10, col: 8 }, { row: 11, col: 8 }, { row: 12, col: 8 }, { row: 13, col: 8 }, { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 }, { row: 13, col: 6 }, { row: 12, col: 6 }, { row: 11, col: 6 }, { row: 10, col: 6 }, { row: 9, col: 6 },
  { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 3 }, { row: 8, col: 2 }, { row: 8, col: 1 }, { row: 8, col: 0 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
];

if (GLOBAL_PATH_COORDS.length !== GLOBAL_PATH_LENGTH) {
  throw new Error("GLOBAL_PATH_COORDS length mismatch with engine constant");
}

// Each color's private 6-square home stretch leading to the center.
export const HOME_STRETCH_COORDS: Record<PlayerColor, Coord[]> = {
  RED: [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }],
  GREEN: [{ row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 }, { row: 5, col: 7 }, { row: 6, col: 7 }],
  YELLOW: [{ row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, { row: 7, col: 10 }, { row: 7, col: 9 }, { row: 7, col: 8 }],
  BLUE: [{ row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 }, { row: 9, col: 7 }, { row: 8, col: 7 }],
};

export const CENTER_COORD: Coord = { row: 7, col: 7 };

// Corner "yard" zones where each color's tokens sit before entering play.
export const BASE_ZONE: Record<PlayerColor, { rowStart: number; colStart: number }> = {
  RED: { rowStart: 0, colStart: 0 },
  GREEN: { rowStart: 0, colStart: 9 },
  YELLOW: { rowStart: 9, colStart: 9 },
  BLUE: { rowStart: 9, colStart: 0 },
};

// 4 token slots per color, inset within their 6x6 yard zone.
export const BASE_COORDS: Record<PlayerColor, Coord[]> = ALL_COLORS.reduce((acc, color) => {
  const { rowStart, colStart } = BASE_ZONE[color];
  acc[color] = [
    { row: rowStart + 1, col: colStart + 1 },
    { row: rowStart + 1, col: colStart + 4 },
    { row: rowStart + 4, col: colStart + 1 },
    { row: rowStart + 4, col: colStart + 4 },
  ];
  return acc;
}, {} as Record<PlayerColor, Coord[]>);

// The 4 decorative unused corners of the center 3x3 block.
export const DECO_CORNERS: Coord[] = [
  { row: 6, col: 6 }, { row: 6, col: 8 }, { row: 8, col: 6 }, { row: 8, col: 8 },
];

export function getSafeCoordSet(): Set<string> {
  const safeGlobals = getSafeGlobalSquares();
  const set = new Set<string>();
  safeGlobals.forEach((idx) => {
    const c = GLOBAL_PATH_COORDS[idx];
    set.add(`${c.row},${c.col}`);
  });
  return set;
}

// Resolves a token's engine position into an actual board coordinate.
export function getRenderCoord(
  color: PlayerColor,
  position: number | "YARD",
  tokenIndex: number
): Coord {
  if (position === "YARD") return BASE_COORDS[color][tokenIndex];
  if (position === 57) return CENTER_COORD;
  if (position >= 51) return HOME_STRETCH_COORDS[color][position - 51];
  return GLOBAL_PATH_COORDS[relativeToGlobal(color, position)];
}

export const COLOR_BG: Record<PlayerColor, string> = {
  RED: "bg-red-500",
  GREEN: "bg-green-500",
  YELLOW: "bg-yellow-400",
  BLUE: "bg-blue-500",
};

export const COLOR_BG_LIGHT: Record<PlayerColor, string> = {
  RED: "bg-red-100",
  GREEN: "bg-green-100",
  YELLOW: "bg-yellow-100",
  BLUE: "bg-blue-100",
};

export const COLOR_BORDER: Record<PlayerColor, string> = {
  RED: "border-red-700",
  GREEN: "border-green-700",
  YELLOW: "border-yellow-600",
  BLUE: "border-blue-700",
};