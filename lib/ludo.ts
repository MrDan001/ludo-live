export type PlayerColor = "red" | "blue" | "green" | "yellow";
export type TokenStatus = "home" | "track" | "finished";
export type TokenState = { id: number; progress: number; status: TokenStatus };
export type PlayerState = { color: PlayerColor; tokens: TokenState[] };

export const TRACK_LENGTH = 52;
export const FINISH_PROGRESS = 57;
export const HOME_ENTRY_ROLL = 6;

// These indexes match the visual route used by the board.
export const START_INDEX: Record<PlayerColor, number> = { red: 0, blue: 11, green: 24, yellow: 35 };
export const COLORS: PlayerColor[] = ["red", "blue", "green", "yellow"];

export function createToken(id: number): TokenState { return { id, progress: -1, status: "home" }; }
export function createPlayer(color: PlayerColor): PlayerState { return { color, tokens: [0,1,2,3].map(createToken) }; }
export function createGame(): PlayerState[] { return COLORS.map(createPlayer); }
export function isOnTrack(token: TokenState): boolean { return token.progress >= 0 && token.progress < FINISH_PROGRESS; }

export function isMovable(token: TokenState, roll: number): boolean {
  if (roll < 1 || roll > 12 || token.status === "finished") return false;
  if (token.status === "home") return roll === HOME_ENTRY_ROLL;
  return token.progress + roll <= FINISH_PROGRESS;
}

export function advanceToken(token: TokenState, roll: number): TokenState | null {
  if (!isMovable(token, roll)) return null;
  if (token.status === "home") return { ...token, progress: 0, status: "track" };
  const nextProgress = token.progress + roll;
  return { ...token, progress: nextProgress, status: nextProgress === FINISH_PROGRESS ? "finished" : "track" };
}

export function globalTrackIndex(color: PlayerColor, token: TokenState): number | null {
  if (!isOnTrack(token)) return null;
  return (START_INDEX[color] + token.progress) % TRACK_LENGTH;
}

export function canKill(attackerColor: PlayerColor, attacker: TokenState, defenderColor: PlayerColor, defender: TokenState): boolean {
  if (attackerColor === defenderColor) return false;
  const a = globalTrackIndex(attackerColor, attacker), d = globalTrackIndex(defenderColor, defender);
  if (a === null || d === null || a !== d) return false;
  const safe = new Set([0, 11, 13, 24, 25, 26, 35, 37, 39, 45]);
  return !safe.has(a);
}

/** Requested kill rule: kill only one opponent token; another token on the same square remains. */
export function killOneOpponent(players: PlayerState[], attackerColor: PlayerColor, movedToken: TokenState): PlayerState[] {
  const next = players.map((player) => ({ ...player, tokens: player.tokens.map((token) => ({ ...token })) }));
  for (const player of next) {
    if (player.color === attackerColor) continue;
    const target = player.tokens.find((token) => canKill(attackerColor, movedToken, player.color, token));
    if (target) { target.progress = -1; target.status = "home"; break; }
  }
  return next;
}

export function playerHasMove(players: PlayerState[], color: PlayerColor, roll: number): boolean {
  const player = players.find((item) => item.color === color);
  return !!player?.tokens.some((token) => isMovable(token, roll));
}
export function allFinished(player: PlayerState): boolean { return player.tokens.every((token) => token.status === "finished"); }
