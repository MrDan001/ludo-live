import { GameState } from "./gameState";
import { DiceRoll } from "./dice";
import { getValidMoves, MoveOption } from "./moves";

export function chooseAIMove(state: GameState, roll: DiceRoll): MoveOption | null {
  const moves = getValidMoves(state, roll);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const yardMoves = moves.filter((m) => m.fromPosition === "YARD");
  if (yardMoves.length > 0) return yardMoves[0];

  const sorted = [...moves].sort((a, b) => b.toPosition - a.toPosition);
  return sorted[0];
}