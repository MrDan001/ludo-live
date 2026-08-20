"use client";

import { useMemo, useState } from "react";
import Board from "@/components/board/Board";
import FitSquare from "@/components/board/FitSquare";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor } from "@/lib/engine/gameState";
import { createInitialGameState, GameState } from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { applyMove, getValidMoves, MoveOption, MoveSource } from "@/lib/engine/moves";

const COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = { RED: "Me", GREEN: "Player1", YELLOW: "Player1", BLUE: "Me" };
type UsedDice = { d1: boolean; d2: boolean };

function freshGame(): GameState { return createInitialGameState(COLORS, [], false); }

function Die({ value, active, used, onClick, disabled }: { value: number; active: boolean; used: boolean; onClick: () => void; disabled: boolean }) {
  const dots = Array.from({ length: value || 0 });
  return <button type="button" aria-label={`Die ${value || "not rolled"}`} onClick={onClick} disabled={disabled} className={`relative grid h-11 w-11 place-items-center rounded-xl border-2 border-red-950/30 bg-gradient-to-br from-red-500 to-red-700 shadow-lg transition-transform ${active ? "-translate-y-1 scale-110 ring-2 ring-yellow-300" : ""} ${used ? "opacity-45" : ""}`}>
    <div className="grid grid-cols-3 gap-0.5 p-1">{dots.map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />)}</div>
    {!value && <span className="absolute text-lg font-black text-white">?</span>}
    {value > 0 && <span className="absolute bottom-0.5 text-[9px] font-black text-white/90">{value}</span>}
  </button>;
}

export default function TestBoardPage() {
  const [gameState, setGameState] = useState<GameState>(() => freshGame());
  const [diceRoll, setDiceRoll] = useState<DiceRoll | null>(null);
  const [usedDice, setUsedDice] = useState<UsedDice>({ d1: false, d2: false });
  const [validMoves, setValidMoves] = useState<MoveOption[]>([]);
  const [activeSource, setActiveSource] = useState<MoveSource | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const sourceMoves = (source: MoveSource) => validMoves.filter(m => m.source === source && !usedDice[source]);
  const enabled = useMemo(() => ({ d1: !!diceRoll && !usedDice.d1 && sourceMoves("d1").length > 0, d2: !!diceRoll && !usedDice.d2 && sourceMoves("d2").length > 0 }), [diceRoll, usedDice, validMoves]);
  const selectableTokenIds = useMemo(() => new Set(activeSource ? sourceMoves(activeSource).map(m => m.tokenId) : []), [activeSource, validMoves, usedDice]);

  const roll = () => {
    if (diceRoll) return;
    const next = rollTwoDice();
    setDiceRoll(next); setUsedDice({ d1: false, d2: false });
    const moves = getValidMoves(gameState, next).filter(m => m.source === "d1" || m.source === "d2");
    setValidMoves(moves); setActiveSource(null);
    setHistory(h => [...h, next.d1, next.d2].slice(-3));
    if (!moves.length) { setTimeout(() => { setDiceRoll(null); setValidMoves([]); }, 700); }
  };

  const chooseDie = (source: MoveSource) => {
    if (!diceRoll || source === "sum" || !sourceMoves(source).length) return;
    setActiveSource(source);
  };

  const selectMove = (tokenId: string) => {
    if (!diceRoll || !activeSource) return;
    const move = sourceMoves(activeSource).find(m => m.tokenId === tokenId);
    if (!move) return;
    const next = applyMove(gameState, move);
    const nextUsed = { ...usedDice, [activeSource]: true } as UsedDice;
    setGameState(next); setUsedDice(nextUsed); setActiveSource(null); setCaptureText("Move!");
    setTimeout(() => setCaptureText(null), 650);
    const remaining = getValidMoves(next, diceRoll).filter(m => (m.source === "d1" && !nextUsed.d1) || (m.source === "d2" && !nextUsed.d2));
    setValidMoves(remaining);
    if (!remaining.length || next.winner) { setDiceRoll(null); setUsedDice({ d1: false, d2: false }); setValidMoves([]); }
  };

  return <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#6b4226] text-white select-none" style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(255,220,160,.18), transparent 60%), repeating-linear-gradient(8deg, rgba(45,20,8,.16) 0 3px, transparent 3px 13px)" }}>
    <header className="z-40 mx-auto w-full max-w-[520px] px-3 pt-2">
      <div className="flex items-center justify-between"><button aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full bg-[#12507b] text-xl shadow-lg">☰</button><div className="text-3xl drop-shadow-lg">👆</div><button aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-2xl font-black shadow-lg">×</button></div>
      <div className="mt-1.5 flex justify-center gap-2"><div className="rounded-full bg-[#073f4a] px-4 py-1 text-xs font-black shadow-md"><span className="text-cyan-300">Me</span>: 0</div><div className="rounded-full bg-[#073f4a] px-4 py-1 text-xs font-black shadow-md"><span className="text-cyan-300">Player1</span>: 0</div></div>
    </header>

    <main className="relative mx-auto flex min-h-0 w-full max-w-[520px] flex-1 items-center justify-center px-2 py-1">
      <div className="relative w-full max-w-[min(96vw,520px)]">
        <div className="absolute -top-1 left-1/2 z-50 flex -translate-x-1/2 -translate-y-full gap-2 rounded-full bg-[#073f4a]/95 px-2 py-1.5 shadow-xl ring-1 ring-white/20">
          <Die value={diceRoll?.d1 ?? 0} used={usedDice.d1} active={activeSource === "d1"} onClick={() => chooseDie("d1")} disabled={!diceRoll || !enabled.d1} />
          <Die value={diceRoll?.d2 ?? 0} used={usedDice.d2} active={activeSource === "d2"} onClick={() => chooseDie("d2")} disabled={!diceRoll || !enabled.d2} />
        </div>
        <FitSquare className="relative w-full" maxSize={900}><Board players={gameState.players} selectableTokenIds={selectableTokenIds} playerNames={PLAYER_NAMES} onTokenClick={selectMove} onCapture={() => setCaptureText("Capture!")} showTapHint /></FitSquare>
      </div>
    </main>

    <footer className="z-40 mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 px-3 pb-2 pt-1">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/40 bg-[#12507b] text-xs font-black shadow-lg">{history[i] ?? 0}</div>)}</div>
      <button type="button" onClick={roll} disabled={!!diceRoll || !!gameState.winner} className="rounded-full bg-[#073f4a] px-7 py-2.5 text-sm font-black shadow-xl ring-1 ring-white/20 disabled:opacity-50">{gameState.winner ? "Winner!" : "Your Turn"}</button>
    </footer>
    <CaptureToast text={captureText} />
  </div>;
}
