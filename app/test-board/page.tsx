"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "@/components/board/Board";
import FitSquare from "@/components/board/FitSquare";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor } from "@/lib/engine/gameState";
import { createInitialGameState, GameState } from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { applyMove, getValidMoves, MoveOption, MoveSource } from "@/lib/engine/moves";

const ACTIVE_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = { RED: "You", GREEN: "Green", YELLOW: "Yellow", BLUE: "Blue" };
type UsedDice = { d1: boolean; d2: boolean };
function freshGame(): GameState { return createInitialGameState(ACTIVE_COLORS, [], false); }
function Die({ value, used, active, onClick, disabled }: { value: number; used: boolean; active: boolean; onClick: () => void; disabled: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} aria-label={`Die ${value}`} className={["relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white text-slate-900 shadow-xl transition-all", active ? "scale-110 ring-4 ring-yellow-300" : "", used ? "opacity-30" : "", disabled ? "cursor-not-allowed" : "active:scale-95"].join(" ")}><span className="text-3xl sm:text-4xl leading-none" aria-hidden="true">🎲</span><span className="absolute inset-0 flex items-center justify-center text-base sm:text-lg font-black">{used ? "✓" : value || ""}</span></button>; }
export default function TestBoardPage() {
  const [gameState, setGameState] = useState<GameState>(() => freshGame()); const [diceRoll, setDiceRoll] = useState<DiceRoll | null>(null); const [usedDice, setUsedDice] = useState<UsedDice>({ d1: false, d2: false }); const [validMoves, setValidMoves] = useState<MoveOption[]>([]); const [activeSource, setActiveSource] = useState<MoveSource | null>(null); const [captureText, setCaptureText] = useState<string | null>(null);
  const sourceMoves = (source: MoveSource) => source === "sum" ? [] : validMoves.filter(m => m.source === source && !usedDice[source]);
  const enabled = useMemo(() => ({ d1: !!diceRoll && !usedDice.d1 && sourceMoves("d1").length > 0, d2: !!diceRoll && !usedDice.d2 && sourceMoves("d2").length > 0 }), [diceRoll, usedDice, validMoves]);
  const selectableTokenIds = useMemo(() => new Set(activeSource ? sourceMoves(activeSource).map(m => m.tokenId) : []), [activeSource, validMoves, usedDice]);
  useEffect(() => { if (activeSource && sourceMoves(activeSource).length === 0) setActiveSource(null); }, [activeSource, validMoves, usedDice]);
  const finishOrContinue = (nextState: GameState, nextUsed: UsedDice, roll: DiceRoll) => { if (nextState.winner) { setGameState(nextState); setDiceRoll(null); setValidMoves([]); setActiveSource(null); return; } const remaining = getValidMoves(nextState, roll).filter(m => (m.source === "d1" && !nextUsed.d1) || (m.source === "d2" && !nextUsed.d2)); setGameState(nextState); setUsedDice(nextUsed); setValidMoves(remaining); setActiveSource(null); if (remaining.length) return; setDiceRoll(null); setUsedDice({ d1: false, d2: false }); setValidMoves([]); };
  const startRoll = () => { if (diceRoll) return; const roll = rollTwoDice(); const moves = getValidMoves(gameState, roll).filter(m => m.source === "d1" || m.source === "d2"); setDiceRoll(roll); setUsedDice({ d1: false, d2: false }); setValidMoves(moves); setActiveSource(null); if (!moves.length) { setDiceRoll(null); setValidMoves([]); } };
  const chooseSource = (source: MoveSource) => { if (!diceRoll || source === "sum" || (source === "d1" && usedDice.d1) || (source === "d2" && usedDice.d2) || !sourceMoves(source).length) return; setActiveSource(source); };
  const selectMove = (tokenId: string) => { if (!diceRoll || !activeSource) return; const move = sourceMoves(activeSource).find(m => m.tokenId === tokenId); if (!move) return; const nextState = applyMove(gameState, move); const nextUsed = { ...usedDice, [activeSource]: true } as UsedDice; setCaptureText("Move complete"); setTimeout(() => setCaptureText(null), 700); finishOrContinue(nextState, nextUsed, diceRoll); };
  const reset = () => { setGameState(freshGame()); setDiceRoll(null); setUsedDice({ d1: false, d2: false }); setValidMoves([]); setActiveSource(null); };
  return <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-slate-950 flex flex-col items-center justify-center text-white p-1">
    <FitSquare className="relative w-full max-w-[100dvh] max-h-[calc(100dvh-3.5rem)]" maxSize={900}>
      <Board players={gameState.players} selectableTokenIds={selectableTokenIds} playerNames={PLAYER_NAMES} onTokenClick={selectMove} onCapture={() => setCaptureText("Capture!")} showTapHint />
    </FitSquare>
    <div className="absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 gap-3"><Die value={diceRoll?.d1 ?? 0} used={usedDice.d1} active={activeSource === "d1"} onClick={() => chooseSource("d1")} disabled={!diceRoll || !enabled.d1} /><Die value={diceRoll?.d2 ?? 0} used={usedDice.d2} active={activeSource === "d2"} onClick={() => chooseSource("d2")} disabled={!diceRoll || !enabled.d2} /></div>
    <div className="absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-2"><button type="button" onClick={startRoll} disabled={!!diceRoll || !!gameState.winner} className="rounded-xl bg-white px-4 py-1.5 text-sm font-bold text-slate-900 disabled:opacity-40">🎲 Roll</button><button type="button" onClick={reset} className="rounded-xl border border-white/30 px-3 py-1.5 text-sm font-semibold">Reset</button></div>
    <CaptureToast text={captureText} />
  </div>;
}
