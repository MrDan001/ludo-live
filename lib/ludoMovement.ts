// Ludo rules and movement. Board geometry lives in lib/ludoBoardCore.ts.

import { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH } from "./ludoBoardCore";

export const COLORS = ["green", "yellow", "blue", "red"] as const;
export type LudoColor = typeof COLORS[number];
export type TokenState = "yard" | "track" | "home" | "finished";

// These are re-exported for existing callers; the values are owned by the board core.
export { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH };

// A token starts at step 0, travels the shared track, then crosses 5 home-lane squares.
export const STEPS_TO_FINISH = TRACK_LENGTH + HOME_STRETCH - 1; // 56

export type LudoToken = {
  color: LudoColor;
  state: TokenState;
  steps: number;
};

export function createToken(color: LudoColor): LudoToken {
  return { color, state: "yard", steps: -1 };
}

export function createPlayerTokens(color: LudoColor, count = 4): LudoToken[] {
  return Array.from({ length: count }, () => createToken(color));
}

// Convert a token's steps into the authoritative board coordinate.
export function getBoardPosition(token: LudoToken): { zone: "track" | "home"; index: number } | null {
  if (token.state !== "track" && token.state !== "home") return null;

  const entry = START_INDEX[token.color];
  if (token.steps < TRACK_LENGTH) {
    return { zone: "track", index: (entry + token.steps) % TRACK_LENGTH };
  }

  return { zone: "home", index: token.steps - TRACK_LENGTH };
}

export function isSafeSquare(trackIndex: number): boolean {
  return SAFE_SQUARES.includes(trackIndex as (typeof SAFE_SQUARES)[number]);
}

export function canMove(token: LudoToken, diceValue: number): boolean {
  if (token.state === "finished") return false;
  if (token.state === "yard") return diceValue === 6;
  const newSteps = token.steps + diceValue;
  return newSteps <= STEPS_TO_FINISH;
}

export function moveToken(token: LudoToken, diceValue: number, allTokens: LudoToken[]): { moved: boolean; token: LudoToken; captured: LudoToken[] } {
  if (!canMove(token, diceValue)) {
    return { moved: false, token, captured: [] };
  }

  if (token.state === "yard") {
    token.state = "track";
    token.steps = 0;
  } else {
    token.steps += diceValue;
    if (token.steps >= TRACK_LENGTH) token.state = "home";
    if (token.steps === STEPS_TO_FINISH) {
      token.state = "finished";
      return { moved: true, token, captured: [] };
    }
  }

  const captured: LudoToken[] = [];
  const pos = getBoardPosition(token);

  // Only shared-track squares can capture. Home lanes are color-owned.
  if (pos && pos.zone === "track" && !isSafeSquare(pos.index)) {
    for (const other of allTokens) {
      if (other === token) continue;
      if (other.color === token.color) continue;
      if (other.state !== "track") continue;

      const otherPos = getBoardPosition(other);
      if (otherPos && otherPos.zone === "track" && otherPos.index === pos.index) {
        other.state = "yard";
        other.steps = -1;
        captured.push(other);
      }
    }
  }

  return { moved: true, token, captured };
}

export function hasLegalMove(colorTokens: LudoToken[], diceValue: number): boolean {
  return colorTokens.some((t) => canMove(t, diceValue));
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}
