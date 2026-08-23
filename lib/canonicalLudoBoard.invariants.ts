import {
  FINISH_PROGRESS,
  HOME_START_PROGRESS,
  TRACK_LENGTH,
  getHomeCell,
  getTrackCell,
  type LudoColor,
} from "./canonicalLudoBoard";

// Master-board route invariants: 51 shared positions, then 5 home cells, then centre.
const COLORS: readonly LudoColor[] = ["green", "yellow", "blue", "red"];

export function assertCanonicalMasterRoute(): void {
  if (TRACK_LENGTH !== 51 || HOME_START_PROGRESS !== 52 || FINISH_PROGRESS !== 57) {
    throw new Error("Canonical master route must be 51 shared + 5 home + centre finish.");
  }

  for (const color of COLORS) {
    const lastShared = getTrackCell(color, TRACK_LENGTH);
    const firstHome = getHomeCell(color, HOME_START_PROGRESS);
    if (!lastShared || !firstHome) throw new Error(`Missing route boundary for ${color}.`);
    if (lastShared[0] === firstHome[0] && lastShared[1] === firstHome[1]) {
      throw new Error(`Shared/home overlap at ${color} home entry.`);
    }
  }
}

assertCanonicalMasterRoute();
