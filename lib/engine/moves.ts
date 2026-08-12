import {
  GameState,
  PlayerColor,
  Token,
  FINISH_POSITION,
  SHARED_PATH_LENGTH,
} from "./gameState";
import { relativeToGlobal, isGlobalSquareSafe } from "./board";
import { DiceRoll } from "./dice";

// Which of the three tabs this move belongs to: "d1" (Blue), "d2" (Green),
// or "sum" (Red - the combined d1+d2 value, played as a single jump straight
// to the landing square; only that final square matters for safety/capture,
// same as any other move).
export type MoveSource = "d1" | "d2" | "sum";

export interface MoveOption {
  tokenId: string;
  fromPosition: Token["position"];
  toPosition: number;
  // The number of squares this move actually advances the token - d1, d2,
  // or d1+d2 depending on source.
  dieValue: number;
  source: MoveSource;
}

// In 2-player team mode, Red+Yellow play as one team and Green+Blue as the
// other. Symmetric on purpose - used both to let a team pick from either
// color's tokens on their turn, and to stop teammates from capturing
// each other.
export const TEAM_PARTNER: Record<PlayerColor, PlayerColor> = {
  RED: "YELLOW",
  YELLOW: "RED",
  GREEN: "BLUE",
  BLUE: "GREEN",
};

// Only RED and GREEN are ever real turn slots in team mode - a team's
// "identity" color for turn order and win/payout resolution, regardless
// of which of their two colors' tokens actually moved.
const PRIMARY_TEAM_COLORS: PlayerColor[] = ["RED", "GREEN"];

function primaryColorOf(color: PlayerColor): PlayerColor {
  return PRIMARY_TEAM_COLORS.includes(color) ? color : TEAM_PARTNER[color];
}

function areTeammates(a: PlayerColor, b: PlayerColor): boolean {
  return TEAM_PARTNER[a] === b;
}

// Returns every legal move available this turn. In team mode this spans
// both of the acting team's colors (e.g. on Red's turn slot, Yellow's
// token moves are offered too) - outside team mode it's just the current
// color, same as always.
//
// Three move sources are offered per roll, matching the three UI tabs:
//   - "d1"  (Blue)  - move using die 1's value alone
//   - "d2"  (Green) - move using die 2's value alone
//   - "sum" (Red)   - move using d1+d2 as a single jump straight to the
//                      landing square. Only the landing square is checked
//                      for safety/capture - squares passed over don't matter.
// A 6 on d1 or d2 individually is required to bring a token out of the
// yard using that die. The combined "sum" value can NEVER exit a token
// from the yard, even if d1+d2 happens to equal 6 (e.g. 1+5) - that
// matches standard Ludo rules, where only an actual rolled 6 opens the yard.
export function getValidMoves(state: GameState, roll: DiceRoll): MoveOption[] {
  const actingColors = state.teamMode
    ? [state.currentTurnColor, TEAM_PARTNER[state.currentTurnColor]]
    : [state.currentTurnColor];

  const sources: { source: MoveSource; dieValue: number; canExitYard: boolean }[] = [
    { source: "d1", dieValue: roll.d1, canExitYard: roll.d1 === 6 },
    { source: "d2", dieValue: roll.d2, canExitYard: roll.d2 === 6 },
    { source: "sum", dieValue: roll.sum, canExitYard: false },
  ];

  const moves: MoveOption[] = [];

  for (const { source, dieValue, canExitYard } of sources) {
    for (const color of actingColors) {
      const player = state.players.find((p) => p.color === color);
      if (!player) continue;

      for (const token of player.tokens) {
        if (token.position === "YARD") {
          if (canExitYard) {
            moves.push({ tokenId: token.id, fromPosition: "YARD", toPosition: 0, dieValue, source });
          }
          continue;
        }

        const newPos = token.position + dieValue;
        if (newPos > FINISH_POSITION) continue;

        moves.push({ tokenId: token.id, fromPosition: token.position, toPosition: newPos, dieValue, source });
      }
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: MoveOption): GameState {
  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));

  // The token's own literal color decides its path/capture math - not
  // necessarily state.currentTurnColor, since in team mode the acting
  // team can move either of their two colors' tokens on one turn.
  const tokenColor = move.tokenId.split("-")[0] as PlayerColor;
  const player = players.find((p) => p.color === tokenColor)!;
  const token = player.tokens.find((t) => t.id === move.tokenId)!;
  token.position = move.toPosition;

  if (move.toPosition >= 0 && move.toPosition < SHARED_PATH_LENGTH) {
    const globalSquare = relativeToGlobal(player.color, move.toPosition);

    if (!isGlobalSquareSafe(globalSquare)) {
      for (const opponent of players) {
        if (opponent.color === player.color) continue;
        if (state.teamMode && areTeammates(player.color, opponent.color)) continue;

        for (const oppToken of opponent.tokens) {
          if (
            typeof oppToken.position === "number" &&
            oppToken.position >= 0 &&
            oppToken.position < SHARED_PATH_LENGTH &&
            relativeToGlobal(opponent.color, oppToken.position) === globalSquare
          ) {
            oppToken.position = "YARD";
          }
        }
      }
    }
  }

  let winner: PlayerColor | null = null;
  const thisColorFinished = player.tokens.every((t) => t.position === FINISH_POSITION);

  if (thisColorFinished) {
    if (state.teamMode) {
      // A team only wins once BOTH of their colors' tokens (all 8) have
      // reached home - finishing one color alone isn't enough.
      const partner = players.find((p) => p.color === TEAM_PARTNER[player.color]);
      const partnerFinished = partner ? partner.tokens.every((t) => t.position === FINISH_POSITION) : false;
      if (partnerFinished) {
        winner = primaryColorOf(player.color);
      }
    } else {
      winner = player.color;
    }
  }

  return {
    ...state,
    players,
    winner,
    phase: winner ? "FINISHED" : state.phase,
  };
}

export function getNextTurnColor(
  state: GameState,
  roll: DiceRoll,
  consecutiveSixes: number
): PlayerColor {
  if (roll.hasSix && consecutiveSixes < 3) {
    return state.currentTurnColor;
  }

  if (state.teamMode) {
    // Only two real turn slots in team mode - straight alternation between
    // the two teams' primary colors, never an independent Yellow/Blue slot.
    return state.currentTurnColor === "RED" ? "GREEN" : "RED";
  }

  const activeColors = state.players.filter((p) => p.isActive).map((p) => p.color);
  const currentIndex = activeColors.indexOf(state.currentTurnColor);
  const nextIndex = (currentIndex + 1) % activeColors.length;
  return activeColors[nextIndex];
}