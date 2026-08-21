// Ludo board movement logic (4 players: Green, Yellow, Blue, Red)
// Standard board: 52-square outer track (shared) + 6-square home stretch per color.

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

export const TRACK_LENGTH = 52;   // shared outer track
export const HOME_STRETCH = 6;    // colored home column length
export const STEPS_TO_FINISH = TRACK_LENGTH + HOME_STRETCH - 1; // steps from own start to home (56)

// Token position representation:
// { color, state: "yard" | "track" | "home" | "finished", steps }
// steps = number of squares moved since leaving the yard (0 to STEPS_TO_FINISH)
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

// Convert a token's "steps" into an absolute board index on the shared track,
// or a home-stretch index. Returns { zone: "track"|"home", index }
export function getBoardPosition(token: LudoToken): { zone: "track" | "home"; index: number } | null {
  if (token.state !== "track") return null;

  const entry = START_INDEX[token.color];
  if (token.steps < TRACK_LENGTH - 1) {
    // still on shared track
    const absoluteIndex = (entry + token.steps) % TRACK_LENGTH;
    return { zone: "track", index: absoluteIndex };
  } else {
    // in home stretch
    const homeIndex = token.steps - (TRACK_LENGTH - 1);
    return { zone: "home", index: homeIndex }; // 0..5
  }
}

export function isSafeSquare(trackIndex: number): boolean {
  return SAFE_SQUARES.includes(trackIndex);
}

// Can this token legally move `diceValue` squares?
export function canMove(token: LudoToken, diceValue: number): boolean {
  if (token.state === "finished") return false;
  if (token.state === "yard") return diceValue === 6;
  const newSteps = token.steps + diceValue;
  return newSteps <= STEPS_TO_FINISH;
}

// Attempt to move a token. Mutates and returns the token, plus any captures.
// allTokens = flat array of every token on the board (all colors), used for capture checks.
export function moveToken(token: LudoToken, diceValue: number, allTokens: LudoToken[]): { moved: boolean; token: LudoToken; captured: LudoToken[] } {
  if (!canMove(token, diceValue)) {
    return { moved: false, token, captured: [] };
  }

  if (token.state === "yard") {
    // Only a 6 releases a token from the yard, landing on its own start square.
    token.state = "track";
    token.steps = 0;
  } else {
    token.steps += diceValue;
    if (token.steps === STEPS_TO_FINISH) {
      token.state = "finished";
      return { moved: true, token, captured: [] };
    }
  }

  const captured: LudoToken[] = [];
  const pos = getBoardPosition(token);

  if (pos && pos.zone === "track" && !isSafeSquare(pos.index)) {
    for (const other of allTokens) {
      if (other === token) continue;
      if (other.color === token.color) continue; // no friendly capture
      if (other.state !== "track") continue;

      const otherPos = getBoardPosition(other);
      if (otherPos && otherPos.zone === "track" && otherPos.index === pos.index) {
        // send opponent token back to their yard
        other.state = "yard";
        other.steps = -1;
        captured.push(other);
      }
    }
  }

  return { moved: true, token, captured };
}

// Returns true if any of this color's tokens can move with the given roll.
export function hasLegalMove(colorTokens: LudoToken[], diceValue: number): boolean {
  return colorTokens.some((t) => canMove(t, diceValue));
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}
