"use client";

import { create } from "zustand";
import {
  GameState,
  PlayerColor,
  createInitialGameState,
} from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { getValidMoves, applyMove, getNextTurnColor, MoveOption, MoveSource } from "@/lib/engine/moves";
import { chooseAIMove } from "@/lib/engine/ai";

const ALL_SOURCES: MoveSource[] = ["d1", "d2", "sum"];

export function sourceEnabledMap(moves: MoveOption[]): Record<MoveSource, boolean> {
  return {
    d1: moves.some((m) => m.source === "d1"),
    d2: moves.some((m) => m.source === "d2"),
    sum: moves.some((m) => m.source === "sum"),
  };
}

// If only one of the three tabs actually has a legal move this roll,
// there's nothing to genuinely choose between - auto-pick it instead of
// making the player tap a tab with no real alternative.
function autoSource(moves: MoveOption[]): MoveSource | null {
  const enabled = ALL_SOURCES.filter((s) => moves.some((m) => m.source === s));
  return enabled.length === 1 ? enabled[0] : null;
}

interface GameStore {
  gameState: GameState | null;
  humanColor: PlayerColor | null;
  diceRoll: DiceRoll | null;
  rollSeq: number;
  validMoves: MoveOption[];
  /** Which tab (Blue/Red/Green) is active - the player tapped it, or it
   *  was auto-picked because it was the only one with a legal move. Null
   *  means the player still needs to tap a tab before any token is
   *  selectable. */
  activeSource: MoveSource | null;
  isBusy: boolean;
  isWaitingOnSelection: boolean;

  initGame: (activeColors: PlayerColor[], aiColors: PlayerColor[], humanColor: PlayerColor) => void;
  rollForHuman: () => void;
  chooseSource: (source: MoveSource) => void;
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
  activeSource: null,
  isBusy: false,
  isWaitingOnSelection: false,

  initGame: (activeColors, aiColors, humanColor) => {
    set({
      gameState: createInitialGameState(activeColors, aiColors),
      humanColor,
      diceRoll: null,
      rollSeq: 0,
      validMoves: [],
      activeSource: null,
      isBusy: false,
      isWaitingOnSelection: false,
    });
  },

  rollForHuman: () => {
    const { gameState, humanColor, isBusy } = get();
    if (!gameState || isBusy || gameState.currentTurnColor !== humanColor || gameState.winner) return;

    const roll = rollTwoDice();
    const moves = getValidMoves(gameState, roll);

    set((s) => ({ diceRoll: roll, rollSeq: s.rollSeq + 1, isBusy: true, activeSource: null }));

    if (moves.length === 0) {
      setTimeout(() => {
        const current = get().gameState!;
        const advanced = advanceTurn(current, roll);
        set({
          gameState: advanced,
          diceRoll: null,
          validMoves: [],
          activeSource: null,
          isBusy: false,
          isWaitingOnSelection: false,
        });
      }, 900);
      return;
    }

    setTimeout(() => {
      set({ validMoves: moves, isBusy: false, isWaitingOnSelection: true, activeSource: autoSource(moves) });
    }, 700);
  },

  chooseSource: (source) => {
    const { validMoves, isWaitingOnSelection } = get();
    if (!isWaitingOnSelection) return;
    if (!validMoves.some((m) => m.source === source)) return;
    set({ activeSource: source });
  },

  // Fixed: previously matched on tokenId alone, so a token with more than
  // one legal move (now common with three tabs instead of two) would
  // always resolve to whichever move happened to come first in the array -
  // not necessarily the tab the player actually tapped. Now matched on
  // tokenId AND the active tab's source, same fix already in place
  // server-side for multiplayer (see server/rooms.ts handleSelectMove).
  selectMove: (tokenId) => {
    const { gameState, diceRoll, validMoves, isWaitingOnSelection, activeSource } = get();
    if (!gameState || !diceRoll || !isWaitingOnSelection || !activeSource) return;

    const move = validMoves.find((m) => m.tokenId === tokenId && m.source === activeSource);
    if (!move) return;

    const applied = applyMove(gameState, move);

    if (applied.winner) {
      set({ gameState: applied, diceRoll: null, validMoves: [], activeSource: null, isWaitingOnSelection: false });
      return;
    }

    const advanced = advanceTurn(applied, diceRoll);
    set({ gameState: advanced, diceRoll: null, validMoves: [], activeSource: null, isWaitingOnSelection: false });
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