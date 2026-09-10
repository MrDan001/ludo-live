import type { WorldMode, WorldEngine } from "./types";
import { arenaEngine } from "./arena";
import { speedEngine } from "./speed";
import { teamsEngine } from "./teams";
import { chaosEngine } from "./chaos";
import { bossEngine } from "./boss";
import { tournamentEngine } from "./tournament";

export const WORLD_ENGINES: Record<WorldMode, WorldEngine> = {
  arena: arenaEngine,
  speed: speedEngine,
  teams: teamsEngine,
  chaos: chaosEngine,
  boss: bossEngine,
  tournament: tournamentEngine,
};

export type { WorldMode, WorldEngine } from "./types";
