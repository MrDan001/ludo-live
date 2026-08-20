export type PlayerColor = "red" | "blue" | "green" | "yellow";
export type TokenStatus = "home" | "track" | "finished";
export type TokenState = { id: number; progress: number; status: TokenStatus };
export type PlayerState = { color: PlayerColor; tokens: TokenState[] };

export const TRACK_LENGTH = 48;
export const FINISH_PROGRESS = 53;
export const HOME_ENTRY_ROLL = 6;
export const START_INDEX: Record<PlayerColor, number> = { red: 0, blue: 33, green: 22, yellow: 11 };
export const COLORS: PlayerColor[] = ["red", "blue", "green", "yellow"];
export const SAFE_TRACK_INDICES = new Set([0, 33, 22, 11, 32, 21, 10, 43]);

export function createToken(id: number): TokenState { return { id, progress: -1, status: "home" }; }
export function createPlayer(color: PlayerColor): PlayerState { return { color, tokens: [0,1,2,3].map(createToken) }; }
export function createGame(): PlayerState[] { return COLORS.map(createPlayer); }
export function isOnTrack(token: TokenState): boolean { return token.progress >= 0 && token.progress < TRACK_LENGTH; }

export function isMovable(token: TokenState, roll: number): boolean {
  if (!Number.isInteger(roll) || roll < 1 || roll > 12 || token.status === "finished") return false;
  if (token.status === "home") return roll === HOME_ENTRY_ROLL;
  return token.progress >= 0 && token.progress + roll <= FINISH_PROGRESS;
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

export function tokenCountAt(players: PlayerState[], color: PlayerColor, trackIndex: number): number {
  return players.find(p => p.color === color)?.tokens.filter(t => globalTrackIndex(color, t) === trackIndex).length ?? 0;
}

export function landingBlocked(players: PlayerState[], attackerColor: PlayerColor, movedToken: TokenState): boolean {
  const index = globalTrackIndex(attackerColor, movedToken);
  if (index === null || SAFE_TRACK_INDICES.has(index)) return false;
  return players.some(p => p.color !== attackerColor && tokenCountAt(players, p.color, index) >= 2);
}

export function canKill(attackerColor: PlayerColor, attacker: TokenState, defenderColor: PlayerColor, defender: TokenState): boolean {
  if (attackerColor === defenderColor) return false;
  const a = globalTrackIndex(attackerColor, attacker), d = globalTrackIndex(defenderColor, defender);
  if (a === null || d === null || a !== d || SAFE_TRACK_INDICES.has(a)) return false;
  return true;
}

export function killOneOpponent(players: PlayerState[], attackerColor: PlayerColor, movedToken: TokenState): PlayerState[] {
  const next = players.map(player => ({ ...player, tokens: player.tokens.map(token => ({ ...token })) }));
  const index = globalTrackIndex(attackerColor, movedToken);
  if (index === null || SAFE_TRACK_INDICES.has(index)) return next;
  for (const player of next) {
    if (player.color === attackerColor) continue;
    const target = player.tokens.find(token => canKill(attackerColor, movedToken, player.color, token));
    if (target) { target.progress = -1; target.status = "home"; break; }
  }
  return next;
}

export function playerHasMove(players: PlayerState[], color: PlayerColor, roll: number): boolean {
  return players.find(item => item.color === color)?.tokens.some(token => isMovable(token, roll)) ?? false;
}

export function movableTokenIds(players: PlayerState[], color: PlayerColor, roll: number): number[] {
  return players.find(p => p.color === color)?.tokens.filter(t => isMovable(t, roll)).map(t => t.id) ?? [];
}

export function chooseBotToken(players: PlayerState[], color: PlayerColor, roll: number): number | null {
  const player = players.find(item => item.color === color);
  if (!player) return null;
  const movable = player.tokens.filter(token => isMovable(token, roll));
  if (!movable.length) return null;
  const candidates = movable.filter(token => {
    const moved = advanceToken(token, roll);
    return moved && !landingBlocked(players, color, moved);
  });
  const usable = candidates.length ? candidates : movable;
  const kill = usable.find(token => {
    const moved = advanceToken(token, roll);
    return moved && players.some(opponent => opponent.color !== color && opponent.tokens.some(enemy => canKill(color, moved, opponent.color, enemy)));
  });
  if (kill) return kill.id;
  const finish = usable.find(token => token.status === "track" && token.progress + roll === FINISH_PROGRESS);
  if (finish) return finish.id;
  const enter = usable.find(token => token.status === "home");
  if (enter) return enter.id;
  return usable.reduce((best, token) => token.progress > best.progress ? token : best).id;
}

export function applyMove(players: PlayerState[], color: PlayerColor, tokenId: number, roll: number): PlayerState[] {
  const next = players.map(player => ({ ...player, tokens: player.tokens.map(token => ({ ...token })) }));
  const player = next.find(item => item.color === color);
  if (!player) return next;
  const token = player.tokens.find(item => item.id === tokenId);
  if (!token) return next;
  const moved = advanceToken(token, roll);
  if (!moved || landingBlocked(next, color, moved)) return next;
  player.tokens = player.tokens.map(item => item.id === tokenId ? moved : item);
  return killOneOpponent(next, color, moved);
}

export function allFinished(player: PlayerState): boolean { return player.tokens.every(token => token.status === "finished"); }
export function winner(players: PlayerState[]): PlayerColor | null { return players.find(allFinished)?.color ?? null; }
