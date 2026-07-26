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
  }
  
  // Returns every legal move for the current player given a two-dice roll.
  // Sum is used as the movement distance; a 6 on either die is required
  // to bring a token out of the yard (the 6 is "spent" exiting, the rest
  // of the sum carries the token forward in the same move).
  export function getValidMoves(state: GameState, roll: DiceRoll): MoveOption[] {
    const player = state.players.find((p) => p.color === state.currentTurnColor);
    if (!player) return [];
  
    const moves: MoveOption[] = [];
  
    for (const token of player.tokens) {
      if (token.position === "YARD") {
        if (roll.hasSix) {
          const toPosition = Math.max(0, roll.sum - 6);
          if (toPosition <= FINISH_POSITION) {
            moves.push({ tokenId: token.id, fromPosition: "YARD", toPosition });
          }
        }
        continue;
      }
  
      const newPos = token.position + roll.sum;
      if (newPos > FINISH_POSITION) continue;
  
      moves.push({ tokenId: token.id, fromPosition: token.position, toPosition: newPos });
    }
  
    return moves;
  }
  
  export function applyMove(state: GameState, move: MoveOption): GameState {
    const players = state.players.map((p) => ({
      ...p,
      tokens: p.tokens.map((t) => ({ ...t })),
    }));
  
    const player = players.find((p) => p.color === state.currentTurnColor)!;
    const token = player.tokens.find((t) => t.id === move.tokenId)!;
    token.position = move.toPosition;
  
    if (move.toPosition >= 0 && move.toPosition < SHARED_PATH_LENGTH) {
      const globalSquare = relativeToGlobal(player.color, move.toPosition);
  
      if (!isGlobalSquareSafe(globalSquare)) {
        for (const opponent of players) {
          if (opponent.color === player.color) continue;
  
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
  
    const winner = player.tokens.every((t) => t.position === FINISH_POSITION)
      ? player.color
      : null;
  
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
    const activeColors = state.players.filter((p) => p.isActive).map((p) => p.color);
    const currentIndex = activeColors.indexOf(state.currentTurnColor);
  
    if (roll.hasSix && consecutiveSixes < 3) {
      return state.currentTurnColor;
    }
  
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
  }