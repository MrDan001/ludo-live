// Ludo rules and movement. Board geometry lives in lib/ludoBoardCore.ts.

import { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH } from "./ludoBoardCore";

export const COLORS = ["green", "yellow", "blue", "red"] as const;
export type LudoColor = typeof COLORS[number];
export type TokenState = "yard" | "track" | "home" | "finished";

export { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH };

// MAIN_PATH has 52 physical shared-track cells. A token traverses the final
// two shared boxes (steps 50 and 51), then enters home at step 52.
export const HOME_ENTRY_STEP = TRACK_LENGTH;
export const STEPS_TO_FINISH = HOME_ENTRY_STEP + HOME_STRETCH - 1;

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

export function getBoardPosition(token: LudoToken): { zone: "track" | "home"; index: number } | null {
  if (token.state !== "track" && token.state !== "home") return null;
  const entry = START_INDEX[token.color];
  if (token.steps < HOME_ENTRY_STEP) {
    return { zone: "track", index: (entry + token.steps) % TRACK_LENGTH };
  }
  return { zone: "home", index: token.steps - HOME_ENTRY_STEP };
}

export function isSafeSquare(trackIndex: number): boolean {
  return SAFE_SQUARES.includes(trackIndex as (typeof SAFE_SQUARES)[number]);
}

export function canMove(token: LudoToken, diceValue: number): boolean {
  if (token.state === "finished") return false;
  if (token.state === "yard") return diceValue === 6;
  return token.steps + diceValue <= STEPS_TO_FINISH;
}

export function moveToken(token: LudoToken, diceValue: number, allTokens: LudoToken[]): { moved: boolean; token: LudoToken; captured: LudoToken[] } {
  if (!canMove(token, diceValue)) return { moved: false, token, captured: [] };

  const movedToken: LudoToken = { ...token };
  if (movedToken.state === "yard") {
    movedToken.state = "track";
    movedToken.steps = 0;
  } else {
    movedToken.steps += diceValue;
    if (movedToken.steps >= HOME_ENTRY_STEP) movedToken.state = "home";
    if (movedToken.steps === STEPS_TO_FINISH) {
      movedToken.state = "finished";
      return { moved: true, token: movedToken, captured: [] };
    }
  }

  const captured: LudoToken[] = [];
  const pos = getBoardPosition(movedToken);
  if (pos && pos.zone === "track" && !isSafeSquare(pos.index)) {
    for (const other of allTokens) {
      if (other === token || other.color === movedToken.color || other.state !== "track") continue;
      const otherPos = getBoardPosition(other);
      if (otherPos && otherPos.zone === "track" && otherPos.index === pos.index) {
        other.state = "yard";
        other.steps = -1;
        captured.push(other);
      }
    }
  }
  return { moved: true, token: movedToken, captured };
}

export function hasLegalMove(colorTokens: LudoToken[], diceValue: number): boolean {
  return colorTokens.some((t) => canMove(t, diceValue));
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}
