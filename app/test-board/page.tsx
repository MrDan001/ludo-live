"use client";

import { useMemo, useState } from "react";
import Board from "@/components/board/Board";
import FitSquare from "@/components/board/FitSquare";
import ScoreBar from "@/components/board/ScoreBar";
import TurnBanner from "@/components/board/TurnBanner";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor, GameState } from "@/lib/engine/gameState";
import { createInitialGameState } from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { applyMove, getValidMoves, MoveOption, MoveSource } from "@/lib/engine/moves";

const HUMAN_COLOR: PlayerColor = "RED";
const ACTIVE_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = {
  RED: "You",
  GREEN: "Test Green",
  YELLOW: "Test Yellow",
  BLUE: "Test Blue",
};

type UsedDice = { d1: boolean; d2: boolean };

function freshGame(): GameState {
  return createInitialGameState(ACTIVE_COLORS, [], false);
}

function movesForSource(moves: MoveOption[], source: MoveSource, used: UsedDice) {
  if (source === "sum") return [];
  if (source === "d1" && used.d1) return [];
  if (source === "d2" && used.d2) return [];
  return moves.filter((m) => m.source === source);
}

export default function TestBoardPage() {
  const [gameState, setGameState] = useState<GameState>(() => freshGame());
  const [diceRoll, setDiceRoll] = useState<DiceRoll | null>(null);
  const [usedDice, setUsedDice] = useState<UsedDice>({ d1: false, d2: false });
  const [validMoves, setValidMoves] = useState<MoveOption[]>([]);
  const [activeSource, setActiveSource] = useState<MoveSource | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [message, setMessage] = useState("Roll the dice to start a test turn.");

  const enabled = useMemo(() => ({
    d1: !!diceRoll && !usedDice.d1 && validMoves.some((m) => m.source === "d1"),
    d2: !!diceRoll && !usedDice.d2 && validMoves.some((m) => m.source === "d2"),
    sum: false,
  }), [diceRoll, usedDice, validMoves]);

  const selectableTokenIds = useMemo(() => new Set(
    activeSource ? movesForSource(validMoves, activeSource, usedDice).map((m) => m.tokenId) : []
  ), [activeSource, validMoves, usedDice]);

  const startRoll = (nextRoll: DiceRoll) => {
    const moves = getValidMoves(gameState, nextRoll).filter((m) => m.source === "d1" || m.source === "d2");
    const d1Moves = moves.some((m) => m.source === "d1");
    const d2Moves = moves.some((m) => m.source === "d2");

    setDiceRoll(nextRoll);
    setUsedDice({ d1: false, d2: false });
    setValidMoves(moves);
    setActiveSource(d1Moves && !d2Moves ? "d1" : !d1Moves && d2Moves ? "d2" : null);

    if (!d1Moves && !d2Moves) {
      setDiceRoll(null);
      setMessage(`Rolled ${nextRoll.d1} + ${nextRoll.d2}. Neither die has a legal move.`);
    } else if (d1Moves && !d2Moves) {
      setMessage(`Rolled ${nextRoll.d1} + ${nextRoll.d2}. Die ${nextRoll.d1} is the only legal move.`);
    } else if (!d1Moves && d2Moves) {
      setMessage(`Rolled ${nextRoll.d1} + ${nextRoll.d2}. Die ${nextRoll.d2} is the only legal move.`);
    } else {
      setMessage(`Rolled ${nextRoll.d1} + ${nextRoll.d2}. Choose either die, then choose a highlighted token.`);
    }
  };

  const roll = () => {
    if (!diceRoll && !gameState.winner) startRoll(rollTwoDice());
  };

  const forcePair = (d1: number, d2: number) => {
    if (diceRoll) return;
    startRoll({ d1, d2, sum: d1 + d2, hasSix: d1 === 6 || d2 === 6 });
  };

  const chooseSource = (source: MoveSource) => {
    if (!diceRoll || source === "sum" || !enabled[source]) return;
    setActiveSource(source);
    setMessage(`Die ${source === "d1" ? diceRoll.d1 : diceRoll.d2} selected. Now choose a highlighted token.`);
  };

  const selectMove = (tokenId: string) => {
    if (!diceRoll || !activeSource) return;
    const move = movesForSource(validMoves, activeSource, usedDice).find((m) => m.tokenId === tokenId);
    if (!move) return;

    const nextState = applyMove(gameState, move);
    const nextUsed: UsedDice = { ...usedDice, [activeSource]: true };
    const remaining = getValidMoves(nextState, diceRoll).filter((m) =>
      (m.source === "d1" && !nextUsed.d1) || (m.source === "d2" && !nextUsed.d2)
    );

    setGameState(nextState);
    setUsedDice(nextUsed);
    setValidMoves(remaining);
    setActiveSource(null);
    setCaptureText("Move complete");
    setTimeout(() => setCaptureText(null), 900);

    if (nextState.winner) {
      setDiceRoll(null);
      setValidMoves([]);
      setMessage("You won the test game. Reset to test again.");
    } else if (remaining.length > 0) {
      setMessage("The other die is still available. Select it, then choose a token.");
    } else {
      setDiceRoll(null);
      setUsedDice({ d1: false, d2: false });
      setValidMoves([]);
      setMessage(diceRoll.d1 === 6 || diceRoll.d2 === 6
        ? "Both dice are resolved. You rolled a 6, so roll again."
        : "Both dice are resolved. Roll again for the next test turn.");
    }
  };

  const reset = () => {
    setGameState(freshGame());
    setDiceRoll(null);
    setUsedDice({ d1: false, d2: false });
    setValidMoves([]);
    setActiveSource(null);
    setMessage("Reset. Roll the dice to start a test turn.");
  };

  const scoreEntries = ACTIVE_COLORS.map((color) => {
    const player = gameState.players.find((p) => p.color === color);
    const value = player ? player.tokens.filter((t) => t.position === 57).length : 0;
    return { label: PLAYER_NAMES[color] ?? color, value, active: color === HUMAN_COLOR };
  });

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden touch-pan-y select-none bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center gap-3 p-3 text-white">
      <div className="text-center shrink-0">
        <h1 className="text-lg font-bold">Ludo Live — Test Board</h1>
        <p className="text-xs text-slate-300">Standalone board test — no multiplayer connection required.</p>
      </div>

      <ScoreBar entries={scoreEntries} />

      <FitSquare className="relative" maxSize={600}>
        <Board
          players={gameState.players}
          selectableTokenIds={selectableTokenIds}
          playerNames={PLAYER_NAMES}
          onTokenClick={selectMove}
          onCapture={() => setCaptureText("Capture!")}
        />
        <CaptureToast text={captureText} />
      </FitSquare>

      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={roll} disabled={!!diceRoll || !!gameState.winner} className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 disabled:opacity-40">{diceRoll ? `Rolled ${diceRoll.d1} + ${diceRoll.d2}` : "Roll Dice"}</button>
          <button type="button" onClick={reset} className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold">Reset</button>
        </div>

        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => forcePair(6, 4)} disabled={!!diceRoll} className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40">Test 6 + 4</button>
          <button type="button" onClick={() => forcePair(2, 5)} disabled={!!diceRoll} className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40">Test 2 + 5</button>
          <button type="button" onClick={() => forcePair(3, 6)} disabled={!!diceRoll} className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40">Test 3 + 6</button>
        </div>

        {diceRoll && (
          <div className="flex gap-3 text-sm font-bold">
            <button type="button" onClick={() => chooseSource("d1")} disabled={!enabled.d1} className={`rounded-full px-5 py-2 ${activeSource === "d1" ? "bg-sky-400 ring-4 ring-sky-200" : "bg-sky-600"} disabled:opacity-30`}>{usedDice.d1 ? "✓" : diceRoll.d1}</button>
            <button type="button" onClick={() => chooseSource("d2")} disabled={!enabled.d2} className={`rounded-full px-5 py-2 ${activeSource === "d2" ? "bg-emerald-400 ring-4 ring-emerald-200" : "bg-emerald-600"} disabled:opacity-30`}>{usedDice.d2 ? "✓" : diceRoll.d2}</button>
          </div>
        )}

        <p className="max-w-xl text-center text-xs text-slate-300">{message}</p>
      </div>

      <TurnBanner text={gameState.winner ? "Test complete" : "Your Test Turn"} isYou={!gameState.winner} />
    </div>
  );
}
