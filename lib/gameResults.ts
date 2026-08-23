import { GameMode, hasWon } from './gameRules';

export type GameResult = {
  status: 'finished' | 'forfeited';
  winnerId: string;
  loserId?: string;
  mode: GameMode;
};

export function buildWinResult(mode: GameMode, winnerId: string, finishedTokens: number, loserId?: string): GameResult | null {
  if (!hasWon(mode, finishedTokens)) return null;
  return { status: 'finished', winnerId, loserId, mode };
}

export function buildForfeitResult(mode: GameMode, winnerId: string, loserId?: string): GameResult {
  return { status: 'forfeited', winnerId, loserId, mode };
}
