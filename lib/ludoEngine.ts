import {
  FINISH_PROGRESS,
  getTokenCell,
  SAFE_CELLS,
  tokenState,
  type LudoColor,
} from "./ludoBoardCore";

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;
export type TokenLike = { color: LudoColor; id: number; position: number; state?: "yard" | "track" | "home" | "finished" };

export const HUMAN_COLORS: readonly LudoColor[] = ["red", "yellow"];
export const BOT_COLORS: readonly LudoColor[] = ["green", "blue"];

const isSameCell = (a: readonly number[] | null, b: readonly number[] | null) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

export function isSafeProgress(color: LudoColor, progress: number) {
  const cell = getTokenCell(color, progress);
  return SAFE_CELLS.some((safe) => isSameCell(cell, [safe.row, safe.col]));
}

export function nextProgress(position: number, dice: DiceValue) {
  if (position === 0) return dice === 6 ? 1 : null;
  const next = position + dice;
  return next <= FINISH_PROGRESS ? next : null;
}

function opponentsAt(tokens: readonly TokenLike[], color: LudoColor, progress: number) {
  const cell = getTokenCell(color, progress);
  if (!cell) return [];
  return tokens.filter((token) =>
    token.position > 0 &&
    token.position < FINISH_PROGRESS &&
    token.color !== color &&
    isSameCell(getTokenCell(token.color, token.position), cell)
  );
}

export function canMove(tokens: readonly TokenLike[], token: TokenLike, dice: DiceValue) {
  if (token.state === "finished" || token.position >= FINISH_PROGRESS) return false;
  const target = nextProgress(token.position, dice);
  if (target === null) return false;
  if (target === FINISH_PROGRESS) return true;

  // A two-token opponent block cannot be entered.
  const opponents = opponentsAt(tokens, token.color, target);
  return opponents.length < 2;
}

export function legalMoves(tokens: readonly TokenLike[], colors: readonly LudoColor[], dice: DiceValue) {
  return tokens.filter((token) => colors.includes(token.color) && canMove(tokens, token, dice));
}

export function hasLegalMove(tokens: readonly TokenLike[], colors: readonly LudoColor[], dice: DiceValue) {
  return legalMoves(tokens, colors, dice).length > 0;
}

export function applyMove(tokens: readonly TokenLike[], token: TokenLike, dice: DiceValue) {
  if (!canMove(tokens, token, dice)) return null;
  const target = nextProgress(token.position, dice);
  if (target === null) return null;

  const moved = tokens.map((item) =>
    item.color === token.color && item.id === token.id
      ? { ...item, position: target, state: tokenState(target) }
      : { ...item }
  );

  if (target !== FINISH_PROGRESS && !isSafeProgress(token.color, target)) {
    const opponents = opponentsAt(moved, token.color, target);
    if (opponents.length === 1) {
      const captured = opponents[0];
      return moved.map((item) =>
        item.color === captured.color && item.id === captured.id
          ? { ...item, position: 0, state: "yard" as const }
          : item
      );
    }
  }

  return moved;
}

export function hasWon(tokens: readonly TokenLike[], colors: readonly LudoColor[]) {
  const owned = tokens.filter((token) => colors.includes(token.color));
  return owned.length > 0 && owned.every((token) => token.position >= FINISH_PROGRESS || token.state === "finished");
}

export function winner(tokens: readonly TokenLike[]) {
  if (hasWon(tokens, HUMAN_COLORS)) return "human" as const;
  if (hasWon(tokens, BOT_COLORS)) return "bot" as const;
  return null;
}

export function isDice(value: number): value is DiceValue {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}
