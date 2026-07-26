"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/hooks/useGameStore";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";

const HUMAN_COLOR = "RED" as const;
const ACTIVE_COLORS = ["RED", "GREEN", "YELLOW", "BLUE"] as const;
const AI_COLORS = ["GREEN", "YELLOW", "BLUE"] as const;

export default function PlayPage() {
  const {
    gameState,
    diceRoll,
    rollSeq,
    validMoves,
    initGame,
    rollForHuman,
    selectMove,
    aiTakeTurn,
    isBusy,
    isWaitingOnSelection,
  } = useGameStore();

  useEffect(() => {
    initGame([...ACTIVE_COLORS], [...AI_COLORS], HUMAN_COLOR);
  }, [initGame]);

  useEffect(() => {
    if (!gameState || gameState.winner) return;
    if (gameState.currentTurnColor === HUMAN_COLOR) return;
    if (isBusy) return;

    const timer = setTimeout(() => aiTakeTurn(), 700);
    return () => clearTimeout(timer);
  }, [gameState, isBusy, aiTakeTurn]);

  if (!gameState) return <div className="p-8">Loading game...</div>;

  const selectableTokenIds = new Set(validMoves.map((m) => m.tokenId));
  const isHumanTurn = gameState.currentTurnColor === HUMAN_COLOR;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center gap-6 p-6">
      <h1 className="text-white text-xl font-bold">Ludo Live — Test Play</h1>

      <div className="text-white">
        Turn: <span className="font-bold">{gameState.currentTurnColor}</span>
        {gameState.winner && <span className="ml-4 text-amber-400">🏆 {gameState.winner} wins!</span>}
      </div>

      <Board players={gameState.players} selectableTokenIds={selectableTokenIds} onTokenClick={selectMove} />

      <Dice
        d1={diceRoll?.d1 ?? null}
        d2={diceRoll?.d2 ?? null}
        rollSeq={rollSeq}
        onRoll={rollForHuman}
        canRoll={isHumanTurn && !diceRoll && !isBusy && !isWaitingOnSelection && !gameState.winner}
      />
    </div>
  );
}