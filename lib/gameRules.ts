export type GameMode = 'bot' | '2p' | '4p' | 'tournament';

export function winnerTokenCount(mode: GameMode): number {
  return mode === '4p' ? 4 : 8;
}

export function hasWon(mode: GameMode, finishedTokens: number): boolean {
  return finishedTokens >= winnerTokenCount(mode);
}

export function isForfeitResult(mode: GameMode): boolean {
  return mode === 'bot' || mode === '2p' || mode === '4p' || mode === 'tournament';
}
