"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "@/components/board/Board";
import FitSquare from "@/components/board/FitSquare";
import ScoreBar from "@/components/board/ScoreBar";
import TurnBanner from "@/components/board/TurnBanner";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor } from "@/lib/engine/gameState";
import { createInitialGameState, GameState } from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { applyMove, getValidMoves, MoveOption, MoveSource } from "@/lib/engine/moves";

const HUMAN_COLOR: PlayerColor = "RED";
const ACTIVE_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = { RED: "You", GREEN: "Green", YELLOW: "Yellow", BLUE: "Blue" };

type UsedDice = { d1: boolean; d2: boolean };

function freshGame(): GameState { return createInitialGameState(ACTIVE_COLORS, [], false); }

function Die({ value, used, active, onClick, disabled }: { value: number; used: boolean; active: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={`Die ${value}`} className={["relative h-16 w-16 rounded-2xl bg-white text-slate-900 shadow-xl transition-all", active ? "scale-110 ring-4 ring-yellow-300" : "", used ? "opacity-30" : "", disabled ? "cursor-not-allowed" : "active:scale-95"].join(" ")}>
      <span className="text-4xl leading-none" aria-hidden="true">🎲</span>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{used ? "✓" : value}</span>
    </button>
  );
}

export default function TestBoardPage() {
  const [gameState, setGameState] = useState<GameState>(() => freshGame());
  const [diceRoll, setDiceRoll] = useState<DiceRoll | null>(null);
  const [usedDice, setUsedDice] = useState<UsedDice>({ d1: false, d2: false });
  const [validMoves, setValidMoves] = useState<MoveOption[]>([]);
  const [activeSource, setActiveSource] = useState<MoveSource | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [message, setMessage] = useState("Roll the dice to start.");
  const [rollKey, setRollKey] = useState(0);

  const sourceMoves = (source: MoveSource) => source === "sum" ? [] : validMoves.filter(m => m.source === source && !usedDice[source]);
  const enabled = useMemo(() => ({ d1: !!diceRoll && !usedDice.d1 && sourceMoves("d1").length > 0, d2: !!diceRoll && !usedDice.d2 && sourceMoves("d2").length > 0 }), [diceRoll, usedDice, validMoves]);
  const selectableTokenIds = useMemo(() => new Set(activeSource ? sourceMoves(activeSource).map(m => m.tokenId) : []), [activeSource, validMoves, usedDice]);

  useEffect(() => {
    if (activeSource && sourceMoves(activeSource).length === 0) setActiveSource(null);
  }, [activeSource, validMoves, usedDice]);

  const finishOrContinue = (nextState: GameState, nextUsed: UsedDice, roll: DiceRoll) => {
    if (nextState.winner) {
      setGameState(nextState); setDiceRoll(null); setValidMoves([]); setActiveSource(null); setMessage("You won! Reset to play again."); return;
    }
    const remaining = getValidMoves(nextState, roll).filter(m => (m.source === "d1" && !nextUsed.d1) || (m.source === "d2" && !nextUsed.d2));
    setGameState(nextState); setUsedDice(nextUsed); setValidMoves(remaining); setActiveSource(null);
    if (remaining.length) { setMessage("Choose the other die."); return; }
    setDiceRoll(null); setUsedDice({ d1: false, d2: false }); setMessage("Turn complete. Roll again.");
  };

  const startRoll = (forced?: [number, number]) => {
    if (diceRoll) return;
    const [d1, d2] = forced ?? [rollTwoDice().d1, rollTwoDice().d2];
    const roll: DiceRoll = { d1, d2, sum: d1 + d2, hasSix: d1 === 6 || d2 === 6 };
    const moves = getValidMoves(gameState, roll).filter(m => m.source === "d1" || m.source === "d2");
    setDiceRoll(roll); setUsedDice({ d1: false, d2: false }); setValidMoves(moves); setActiveSource(null); setRollKey(n => n + 1);
    if (!moves.length) { setDiceRoll(null); setMessage("No legal move. Roll again."); }
    else setMessage("Choose either die, then choose a highlighted token.");
  };

  const chooseSource = (source: MoveSource) => {
    if (!diceRoll || source === "sum" || (source === "d1" && usedDice.d1) || (source === "d2" && usedDice.d2) || !sourceMoves(source).length) return;
    setActiveSource(source); setMessage("Now choose a highlighted token.");
  };

  const selectMove = (tokenId: string) => {
    if (!diceRoll || !activeSource) return;
    const move = sourceMoves(activeSource).find(m => m.tokenId === tokenId);
    if (!move) return;
    const nextState = applyMove(gameState, move);
    const nextUsed = { ...usedDice, [activeSource]: true } as UsedDice;
    setCaptureText("Move complete"); setTimeout(() => setCaptureText(null), 900);
    finishOrContinue(nextState, nextUsed, diceRoll);
  };

  const reset = () => { setGameState(freshGame()); setDiceRoll(null); setUsedDice({ d1: false, d2: false }); setValidMoves([]); setActiveSource(null); setMessage("Roll the dice to start."); };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden touch-pan-y select-none bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center gap-3 p-3 text-white">
      <div className="text-center shrink-0"><h1 className="text-lg font-bold">Ludo Live</h1><p className="text-xs text-slate-300">Board Test</p></div>
      <ScoreBar entries={ACTIVE_COLORS.map(color => ({ label: PLAYER_NAMES[color] ?? color, value: gameState.players.find(p => p.color === color)?.tokens.filter(t => t.position === 57).length ?? 0, active: color === HUMAN_COLOR }))} />
      <FitSquare className="relative" maxSize={600}>
        <Board players={gameState.players} selectableTokenIds={selectableTokenIds} playerNames={PLAYER_NAMES} onTokenClick={selectMove} onCapture={() => setCaptureText("Capture!")} />
        <div className="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 gap-3">
          <Die value={diceRoll?.d1 ?? 0} used={usedDice.d1} active={activeSource === "d1"} onClick={() => chooseSource("d1")} disabled={!diceRoll || !enabled.d1} />
          <Die value={diceRoll?.d2 ?? 0} used={usedDice.d2} active={activeSource === "d2"} onClick={() => chooseSource("d2")} disabled={!diceRoll || !enabled.d2} />
        </div>
        <CaptureToast text={captureText} />
      </FitSquare>
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => startRoll()} disabled={!!diceRoll || !!gameState.winner} className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 disabled:opacity-40">🎲 Roll</button>
        <button type="button" onClick={reset} className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold">Reset</button>
      </div>
      <p className="max-w-xl text-center text-xs text-slate-300">{message}</p>
      <TurnBanner text={gameState.winner ? "Test complete" : "Your Turn"} isYou={!gameState.winner} />
    </div>
  );
}
