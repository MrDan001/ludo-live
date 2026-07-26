// Core game state types and reducers

// Core types for the Ludo game engine

export type PlayerColor = "RED" | "GREEN" | "YELLOW" | "BLUE";

export const ALL_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];

// A token's position:
// "YARD"   -> not yet on the board
// 0-50     -> relative steps along this color's own path on the shared 52-square loop
// 51-56    -> steps into this color's private 6-square home stretch
// 57       -> finished (reached home)
export type TokenPosition = "YARD" | number;

export const FINISH_POSITION = 57;
export const HOME_ENTRY_POSITION = 51; // first home-stretch step
export const SHARED_PATH_LENGTH = 51; // steps 0-50 are shared-path steps

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

// activeColors: which of the 4 colors are actually playing (2-4 of them)
export function createInitialGameState(
  activeColors: PlayerColor[],
  aiColors: PlayerColor[] = []
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
  };
}