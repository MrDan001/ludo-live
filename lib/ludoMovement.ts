// Ludo board movement logic (4 players: Green, Yellow, Blue, Red)
// Standard board: 52-square outer track + 5 visible home-lane squares per color.

export const COLORS = ["green", "yellow", "blue", "red"] as const;
export type LudoColor = typeof COLORS[number];
export type TokenState = "yard" | "track" | "home" | "finished";

// Each color's entry square index on the 52-square shared track (clockwise).
export const START_INDEX: Record<LudoColor, number> = {
  green: 0,
  yellow: 13,
  blue: 26,
  red: 39,
};

// Safe squares on the shared track (starting squares + star squares).
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export const TRACK_LENGTH = 52;
export const HOME_STRETCH = 5;
// A token starts at step 0, travels the remaining 51 outer-track squares,
// then crosses 5 visible home-lane squares before finishing.
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

// Convert a token's steps into the actual board square.
// Steps 0..51 are ALL 52 shared-track squares.
// Steps 52..56 are the 5 colored home-lane squares.
export function getBoardPosition(token: LudoToken): { zone: "track" | "home"; index: number } | null {
  if (token.state !== "track" && token.state !== "home") return null;

  const entry = START_INDEX[token.color];
  if (token.steps < TRACK_LENGTH) {
    const absoluteIndex = (entry + token.steps) % TRACK_LENGTH;
    return { zone: "track", index: absoluteIndex };
  }

  const homeIndex = token.steps - TRACK_LENGTH;
  return { zone: "home", index: homeIndex }; // 0..4
}

export function isSafeSquare(trackIndex: number): boolean {
  return SAFE_SQUARES.includes(trackIndex);
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
    // A six releases the token to its own starting square.
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
