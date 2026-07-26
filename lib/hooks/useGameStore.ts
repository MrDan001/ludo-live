"use client";

import { create } from "zustand";
import {
  GameState,
  PlayerColor,
  createInitialGameState,
} from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { getValidMoves, applyMove, getNextTurnColor, MoveOption } from "@/lib/engine/moves";
import { chooseAIMove } from "@/lib/engine/ai";

interface GameStore {
  gameState: GameState | null;
  humanColor: PlayerColor | null;
  diceRoll: DiceRoll | null;
  rollSeq: number;
  validMoves: MoveOption[];
  isBusy: boolean;
  isWaitingOnSelection: boolean;

  initGame: (activeColors: PlayerColor[], aiColors: PlayerColor[], humanColor: PlayerColor) => void;
  rollForHuman: () => void;
  selectMove: (tokenId: string) => void;
  aiTakeTurn: () => void;
}

function advanceTurn(state: GameState, roll: DiceRoll): GameState {
  const consecutiveSixes = roll.hasSix ? state.consecutiveSixes + 1 : 0;
  const forfeited = consecutiveSixes >= 3;
  const nextColor = getNextTurnColor(state, roll, forfeited ? 3 : consecutiveSixes);
  return {
    ...state,
    currentTurnColor: nextColor,
    consecutiveSixes: forfeited ? 0 : consecutiveSixes,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  humanColor: null,
  diceRoll: null,
  rollSeq: 0,
  validMoves: [],
  isBusy: false,
  isWaitingOnSelection: false,

  initGame: (activeColors, aiColors, humanColor) => {
    set({
      gameState: createInitialGameState(activeColors, aiColors),
      humanColor,
      diceRoll: null,
      rollSeq: 0,
      validMoves: [],
      isBusy: false,
      isWaitingOnSelection: false,
    });
  },

  rollForHuman: () => {
    const { gameState, humanColor, isBusy } = get();
    if (!gameState || isBusy || gameState.currentTurnColor !== humanColor || gameState.winner) return;

    const roll = rollTwoDice();
    const moves = getValidMoves(gameState, roll);

    set((s) => ({ diceRoll: roll, rollSeq: s.rollSeq + 1, isBusy: true }));

    if (moves.length === 0) {
      setTimeout(() => {
        const current = get().gameState!;
        const advanced = advanceTurn(current, roll);
        set({ gameState: advanced, diceRoll: null, validMoves: [], isBusy: false, isWaitingOnSelection: false });
      }, 900);
      return;
    }

    setTimeout(() => {
      set({ validMoves: moves, isBusy: false, isWaitingOnSelection: true });
    }, 700);
  },

  selectMove: (tokenId) => {
    const { gameState, diceRoll, validMoves, isWaitingOnSelection } = get();
    if (!gameState || !diceRoll || !isWaitingOnSelection) return;

    const move = validMoves.find((m) => m.tokenId === tokenId);
    if (!move) return;

    const applied = applyMove(gameState, move);

    if (applied.winner) {
      set({ gameState: applied, diceRoll: null, validMoves: [], isWaitingOnSelection: false });
      return;
    }

    const advanced = advanceTurn(applied, diceRoll);
    set({ gameState: advanced, diceRoll: null, validMoves: [], isWaitingOnSelection: false });
  },

  aiTakeTurn: () => {
    const { gameState, isBusy } = get();
    if (!gameState || isBusy || gameState.winner) return;

    set({ isBusy: true });

    const roll = rollTwoDice();
    const moves = getValidMoves(gameState, roll);

    set((s) => ({ diceRoll: roll, rollSeq: s.rollSeq + 1 }));

    setTimeout(() => {
      const current = get().gameState!;
      let nextState = current;

      if (moves.length > 0) {
        const chosen = chooseAIMove(current, roll);
        if (chosen) nextState = applyMove(current, chosen);
      }

      if (nextState.winner) {
        set({ gameState: nextState, diceRoll: null, isBusy: false });
        return;
      }

      const advanced = advanceTurn(nextState, roll);
      set({ gameState: advanced, diceRoll: null, isBusy: false });
    }, 900);
  },
}));