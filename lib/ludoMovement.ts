// Ludo rules and movement. Board geometry lives in lib/ludoBoardCore.ts.

import { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH } from "./ludoBoardCore";

export const COLORS = ["green", "yellow", "blue", "red"] as const;
export type LudoColor = typeof COLORS[number];
export type TokenState = "yard" | "track" | "home" | "finished";

// These are re-exported for existing callers; the values are owned by the board core.
export { SAFE_SQUARES, START_INDEX, TRACK_LENGTH, HOME_STRETCH };

// The 52nd physical ring square is the player's entry/start square. A token
// starts on that square at step 0, so it completes 51 shared-track positions
// (0..50) before turning into its 5-square private home lane (51..55).
export const SHARED_TRACK_STEPS = TRACK_LENGTH - 1; // 51
export const STEPS_TO_FINISH = SHARED_TRACK_STEPS + HOME_STRETCH; // 56

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

// Convert a token's relative progress into the authoritative board coordinate.
// Step 0 is the player's coloured start square. Steps 0..50 are the shared
// track; steps 51..55 are the five home-lane squares; 56 is the goal.
export function getBoardPosition(token: LudoToken): { zone: "track" | "home"; index: number } | null {
  if (token.state !== "track" && token.state !== "home") return null;

  const entry = START_INDEX[token.color];
  if (token.steps < SHARED_TRACK_STEPS) {
    return { zone: "track", index: (entry + token.steps) % TRACK_LENGTH };
  }

  return { zone: "home", index: token.steps - SHARED_TRACK_STEPS };
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

  // Never mutate the token object held in React state. The board animation
  // compares the previous state with the new state; mutating the old object
  // makes both positions identical and causes the token to appear to jump.
  const movedToken: LudoToken = { ...token };

  if (movedToken.state === "yard") {
    movedToken.state = "track";
    movedToken.steps = 0;
  } else {
    movedToken.steps += diceValue;
    if (movedToken.steps >= SHARED_TRACK_STEPS) movedToken.state = "home";
    if (movedToken.steps === STEPS_TO_FINISH) {
      movedToken.state = "finished";
      return { moved: true, token: movedToken, captured: [] };
    }
  }

  const captured: LudoToken[] = [];
  const pos = getBoardPosition(movedToken);

  // Only shared-track squares can capture. Home lanes are color-owned.
  if (pos && pos.zone === "track" && !isSafeSquare(pos.index)) {
    for (const other of allTokens) {
      if (other === token) continue;
      if (other.color === movedToken.color) continue;
      if (other.state !== "track") continue;

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
