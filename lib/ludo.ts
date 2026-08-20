export type PlayerColor = "red" | "blue" | "green" | "yellow";
export type TokenStatus = "home" | "track" | "finished";
export type TokenState = { id: number; progress: number; status: TokenStatus };
export type PlayerState = { color: PlayerColor; tokens: TokenState[] };

export const TRACK_LENGTH = 48;
export const FINISH_PROGRESS = 53;
export const HOME_ENTRY_ROLL = 6;

// IMPORTANT: these are board-route indices, not arbitrary player offsets.
// BOARD_ROUTE is clockwise. Each player enters the shared route from the
// square immediately outside the opposite side of their home box.
// Red is the reference route and remains unchanged.
export const START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 17,
  yellow: 35,
  blue: 11,
};

export const COLORS: PlayerColor[] = ["red", "green", "yellow", "blue"];
export const SAFE_TRACK_INDICES = new Set([0, 11, 17, 35]);

export function createToken(id: number): TokenState { return { id, progress: -1, status: "home" }; }
export function createPlayer(color: PlayerColor): PlayerState { return { color, tokens: [0, 1, 2, 3].map(createToken) }; }
export function createGame(): PlayerState[] { return COLORS.map(createPlayer); }
export function isOnTrack(token: TokenState): boolean { return token.status === "track" && token.progress >= 0 && token.progress < TRACK_LENGTH; }
export function isMovable(token: TokenState, roll: number): boolean {
  if (!Number.isInteger(roll) || roll < 1 || roll > 12 || token.status === "finished") return false;
  if (token.status === "home") return roll === HOME_ENTRY_ROLL;
  return token.progress >= 0 && token.progress + roll <= FINISH_PROGRESS;
}
export function advanceToken(token: TokenState, roll: number): TokenState | null {
  if (!isMovable(token, roll)) return null;
  if (token.status === "home") return { ...token, progress: 0, status: "track" };
  const next = token.progress + roll;
  return { ...token, progress: next, status: next === FINISH_PROGRESS ? "finished" : "track" };
}
export function globalTrackIndex(color: PlayerColor, token: TokenState): number | null {
  return isOnTrack(token) ? (START_INDEX[color] + token.progress) % TRACK_LENGTH : null;
}
export function tokenCountAt(players: PlayerState[], color: PlayerColor, index: number): number {
  return players.find(p => p.color === color)?.tokens.filter(t => globalTrackIndex(color, t) === index).length ?? 0;
}
export function landingBlocked(players: PlayerState[], attackerColor: PlayerColor, moved: TokenState): boolean {
  const index = globalTrackIndex(attackerColor, moved);
  if (index === null || SAFE_TRACK_INDICES.has(index)) return false;
  return players.some(p => p.color !== attackerColor && tokenCountAt(players, p.color, index) >= 2);
}
export function canKill(attackerColor: PlayerColor, attacker: TokenState, defenderColor: PlayerColor, defender: TokenState): boolean {
  const a = globalTrackIndex(attackerColor, attacker), d = globalTrackIndex(defenderColor, defender);
  return attackerColor !== defenderColor && a !== null && a === d && !SAFE_TRACK_INDICES.has(a);
}
export function killOneOpponent(players: PlayerState[], attackerColor: PlayerColor, moved: TokenState): PlayerState[] {
  const next = players.map(p => ({ ...p, tokens: p.tokens.map(t => ({ ...t })) }));
  const index = globalTrackIndex(attackerColor, moved);
  if (index === null || SAFE_TRACK_INDICES.has(index)) return next;
  for (const p of next) {
    if (p.color === attackerColor) continue;
    const target = p.tokens.find(t => canKill(attackerColor, moved, p.color, t));
    if (target) { target.progress = -1; target.status = "home"; break; }
  }
  return next;
}
export function playerHasMove(players: PlayerState[], color: PlayerColor, roll: number): boolean {
  return players.find(p => p.color === color)?.tokens.some(t => isMovable(t, roll)) ?? false;
}
export function movableTokenIds(players: PlayerState[], color: PlayerColor, roll: number): number[] {
  return players.find(p => p.color === color)?.tokens.filter(t => isMovable(t, roll)).map(t => t.id) ?? [];
}
export function chooseBotToken(players: PlayerState[], color: PlayerColor, roll: number): number | null {
  const p = players.find(x => x.color === color); if (!p) return null;
  const movable = p.tokens.filter(t => isMovable(t, roll)); if (!movable.length) return null;
  const safe = movable.filter(t => { const m = advanceToken(t, roll); return m && !landingBlocked(players, color, m); });
  const pool = safe.length ? safe : movable;
  const capture = pool.find(t => { const m = advanceToken(t, roll); return m && players.some(o => o.color !== color && o.tokens.some(e => canKill(color, m, o.color, e))); });
  if (capture) return capture.id;
  const finish = pool.find(t => t.status === "track" && t.progress + roll === FINISH_PROGRESS);
  if (finish) return finish.id;
  const enter = pool.find(t => t.status === "home");
  if (enter) return enter.id;
  return pool.reduce((best, t) => t.progress > best.progress ? t : best).id;
}
export function applyMove(players: PlayerState[], color: PlayerColor, tokenId: number, roll: number): PlayerState[] {
  const next = players.map(p => ({ ...p, tokens: p.tokens.map(t => ({ ...t })) }));
  const p = next.find(x => x.color === color); if (!p) return next;
  const token = p.tokens.find(t => t.id === tokenId); if (!token) return next;
  const moved = advanceToken(token, roll); if (!moved || landingBlocked(next, color, moved)) return next;
  p.tokens = p.tokens.map(t => t.id === tokenId ? moved : t);
  return killOneOpponent(next, color, moved);
}
export function allFinished(player: PlayerState): boolean { return player.tokens.every(t => t.status === "finished"); }
export function winner(players: PlayerState[]): PlayerColor | null { return players.find(allFinished)?.color ?? null; }
