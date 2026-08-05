import {
  GameState,
  PlayerColor,
  Token,
  FINISH_POSITION,
  SHARED_PATH_LENGTH,
} from "./gameState";
import { relativeToGlobal, isGlobalSquareSafe } from "./board";
import { DiceRoll } from "./dice";

export interface MoveOption {
  tokenId: string;
  fromPosition: Token["position"];
  toPosition: number;
  // Which individual die value this move uses - d1 and d2 are never
  // combined into a sum for movement, the player picks one or the other.
  dieValue: number;
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
// Each die is used independently - d1 and d2 are never summed for
// movement. A 6 on a given die is required to bring a token out of the
// yard using THAT die specifically (landing exactly on the entry square,
// not carried further by the other die's value).
export function getValidMoves(state: GameState, roll: DiceRoll): MoveOption[] {
  const actingColors = state.teamMode
    ? [state.currentTurnColor, TEAM_PARTNER[state.currentTurnColor]]
    : [state.currentTurnColor];

  // Doubles (d1 === d2) collapse to one usable value - there's no real
  // choice to offer when both dice show the same number.
  const dieValues = Array.from(new Set([roll.d1, roll.d2]));

  const moves: MoveOption[] = [];

  for (const dieValue of dieValues) {
    for (const color of actingColors) {
      const player = state.players.find((p) => p.color === color);
      if (!player) continue;

      for (const token of player.tokens) {
        if (token.position === "YARD") {
          if (dieValue === 6) {
            moves.push({ tokenId: token.id, fromPosition: "YARD", toPosition: 0, dieValue });
          }
          continue;
        }

        const newPos = token.position + dieValue;
        if (newPos > FINISH_POSITION) continue;

        moves.push({ tokenId: token.id, fromPosition: token.position, toPosition: newPos, dieValue });
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