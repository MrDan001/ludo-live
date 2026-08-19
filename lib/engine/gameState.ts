// Core game state types and reducers

// Core types for the Ludo game engine

export type PlayerColor = "RED" | "GREEN" | "YELLOW" | "BLUE";

export const ALL_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];

// A token's position:
// "YARD"   -> not yet on the board
// 0-51     -> relative steps along this color's own path on the shared 52-square loop
// 52-57    -> steps into this color's private 6-square home stretch
// 58       -> finished (reached home)
export type TokenPosition = "YARD" | number;

export const FINISH_POSITION = 58;
export const HOME_ENTRY_POSITION = 52; // first home-stretch step
export const SHARED_PATH_LENGTH = 52; // steps 0-51 are shared-path steps

export interface Token {
  id: string; // e.g. "RED-0"
  color: PlayerColor;
  position: TokenPosition;
}

export interface Player {
  color: PlayerColor;
  isAI: boolean;
  isActive: boolean; // false if this color slot isn't in play (2-3 player games)
  tokens: Token[];
}

export type GamePhase = "WAITING" | "ROLLING" | "MOVING" | "FINISHED";

export interface GameState {
  players: Player[];
  currentTurnColor: PlayerColor;
  diceValue: number | null;
  phase: GamePhase;
  consecutiveSixes: number; // rolling three 6's in a row forfeits the turn
  winner: PlayerColor | null;
  // 2-player games: Red+Yellow play as one team and Green+Blue as the other.
  // See lib/engine/moves.ts for how this changes move selection, capture
  // immunity, turn order, and the win condition.
  teamMode: boolean;
}

export function createToken(color: PlayerColor, index: number): Token {
  return { id: `${color}-${index}`, color, position: "YARD" };
}

export function createPlayer(color: PlayerColor, isAI = false): Player {
  return {
    color,
    isAI,
    isActive: true,
    tokens: [0, 1, 2, 3].map((i) => createToken(color, i)),
  };
}

// activeColors: which of the 4 colors are actually playing (2-4 of them).
// In team mode, all 4 are passed as active even though only 2 humans are
// present - Yellow and Blue are real, playable colors owned by their
// teammate, not placeholders.
export function createInitialGameState(
  activeColors: PlayerColor[],
  aiColors: PlayerColor[] = [],
  teamMode = false
): GameState {
  const players = ALL_COLORS.map((color) => {
    const player = createPlayer(color, aiColors.includes(color));
    player.isActive = activeColors.includes(color);
    return player;
  });

  return {
    players,
    currentTurnColor: activeColors[0],
    diceValue: null,
    phase: "WAITING",
    consecutiveSixes: 0,
    winner: null,
    teamMode,
  };
}
