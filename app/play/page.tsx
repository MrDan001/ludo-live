"use client";

import { useEffect, useState } from "react";
import { useGameStore, sourceEnabledMap } from "@/lib/hooks/useGameStore";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import DiceOverlay from "@/components/board/DiceOverlay";
import ScoreBar from "@/components/board/ScoreBar";
import TurnBanner from "@/components/board/TurnBanner";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor } from "@/lib/engine/gameState";

const HUMAN_COLOR = "RED" as const;
const ACTIVE_COLORS = ["RED", "GREEN", "YELLOW", "BLUE"] as const;
const AI_COLORS = ["GREEN", "YELLOW", "BLUE"] as const;
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = {
  RED: "Me",
  GREEN: "Bot Green",
  YELLOW: "Bot Yellow",
  BLUE: "Bot Blue",
};

export default function PlayPage() {
  const [captureText, setCaptureText] = useState<string | null>(null);
  const {
    gameState,
    diceRoll,
    rollSeq,
    validMoves,
    activeSource,
    initGame,
    rollForHuman,
    chooseSource,
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

  const selectableTokenIds = new Set(
    isWaitingOnSelection && activeSource
      ? validMoves.filter((m) => m.source === activeSource).map((m) => m.tokenId)
      : []
  );
  const isHumanTurn = gameState.currentTurnColor === HUMAN_COLOR;

  const scoreEntries = ACTIVE_COLORS.map((color) => {
    const player = gameState.players.find((p) => p.color === color);
    const value = player ? player.tokens.filter((t) => t.position === 57).length : 0;
    return { label: PLAYER_NAMES[color] ?? color, value, active: gameState.currentTurnColor === color };
  });

  const turnText = gameState.winner
    ? `${PLAYER_NAMES[gameState.winner] ?? gameState.winner} wins!`
    : isHumanTurn
    ? "Your Turn"
    : `${PLAYER_NAMES[gameState.currentTurnColor] ?? gameState.currentTurnColor}'s Turn`;

  const handleCapture = (info: { tokenId: string; color: PlayerColor }) => {
    const name = PLAYER_NAMES[info.color] ?? info.color;
    setCaptureText(`${name}'s token was sent home!`);
    setTimeout(() => setCaptureText(null), 1800);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden touch-pan-y select-none bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center gap-4 p-4">
      <h1 className="text-white text-lg font-bold shrink-0">Ludo Live — Test Play</h1>

      <ScoreBar entries={scoreEntries} />

      <div className="relative w-full max-w-[min(600px,94vw,calc(100dvh_-_280px))] aspect-square shrink">
        <Board
          players={gameState.players}
          selectableTokenIds={selectableTokenIds}
          playerNames={PLAYER_NAMES}
          onTokenClick={selectMove}
          onCapture={handleCapture}
        />
        <DiceOverlay
          onRoll={rollForHuman}
          canRoll={isHumanTurn && !diceRoll && !isBusy && !isWaitingOnSelection && !gameState.winner}
          rollSeq={rollSeq}
          d1={diceRoll?.d1 ?? null}
          d2={diceRoll?.d2 ?? null}
        />
        <CaptureToast text={captureText} />
      </div>

      <Dice
        roll={diceRoll ? { d1: diceRoll.d1, d2: diceRoll.d2, sum: diceRoll.sum } : null}
        activeSource={isHumanTurn ? activeSource : null}
        sourceEnabled={sourceEnabledMap(validMoves)}
        onSelect={chooseSource}
        disabled={!isHumanTurn || !isWaitingOnSelection}
      />

      <TurnBanner text={turnText} isYou={isHumanTurn && !gameState.winner} />
    </div>
  );
}
