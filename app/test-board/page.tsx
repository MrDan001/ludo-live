"use client";

import { useMemo, useState } from "react";
import Board from "@/components/board/Board";
import CaptureToast from "@/components/board/CaptureToast";
import type { PlayerColor } from "@/lib/engine/gameState";
import { createInitialGameState, GameState } from "@/lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "@/lib/engine/dice";
import { applyMove, getValidMoves, MoveOption, MoveSource } from "@/lib/engine/moves";

const COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
const PLAYER_NAMES: Partial<Record<PlayerColor, string>> = { RED: "Me", GREEN: "Player1", YELLOW: "Player1", BLUE: "Me" };
type UsedDice = { d1: boolean; d2: boolean };
const freshGame = (): GameState => createInitialGameState(COLORS, [], false);

const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, active, used, onClick, disabled }: { value: number; active: boolean; used: boolean; onClick: () => void; disabled: boolean }) {
  const cells = PIP_CELLS[Math.max(1, Math.min(6, value))];
  return (
    <button
      type="button"
      aria-label={`Die ${value}`}
      onClick={onClick}
      disabled={disabled}
      className={`relative grid aspect-square w-[clamp(54px,15vw,78px)] shrink-0 grid-cols-3 grid-rows-3 gap-[7%] rounded-[18px] border-[3px] border-red-950/40 bg-gradient-to-br from-red-500 to-red-700 p-[11%] shadow-[0_7px_14px_rgba(0,0,0,.35)] transition-transform ${active ? "-translate-y-1 scale-105 ring-2 ring-yellow-300" : ""} ${used ? "opacity-50" : ""}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {cells.includes(i) && <span className="block h-full w-full max-h-[14px] max-w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />}
        </span>
      ))}
    </button>
  );
}

export default function TestBoardPage() {
  const [gameState, setGameState] = useState<GameState>(() => freshGame());
  const [diceRoll, setDiceRoll] = useState<DiceRoll | null>({ d1: 4, d2: 5 });
  const [usedDice, setUsedDice] = useState<UsedDice>({ d1: false, d2: false });
  const [validMoves, setValidMoves] = useState<MoveOption[]>([]);
  const [activeSource, setActiveSource] = useState<MoveSource | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([4, 2, 0]);

  const sourceMoves = (source: MoveSource) => {
    if (source === "sum") return [];
    const used = source === "d1" ? usedDice.d1 : usedDice.d2;
    return validMoves.filter((m) => m.source === source && !used);
  };
  const enabled = useMemo(() => ({ d1: !!diceRoll && !usedDice.d1 && sourceMoves("d1").length > 0, d2: !!diceRoll && !usedDice.d2 && sourceMoves("d2").length > 0 }), [diceRoll, usedDice, validMoves]);
  const selectableTokenIds = useMemo(() => new Set(activeSource ? sourceMoves(activeSource).map((m) => m.tokenId) : []), [activeSource, validMoves, usedDice]);

  const roll = () => {
    const next = rollTwoDice();
    setDiceRoll(next);
    setUsedDice({ d1: false, d2: false });
    setValidMoves(getValidMoves(gameState, next).filter((m) => m.source === "d1" || m.source === "d2"));
    setActiveSource(null);
    setHistory((h) => [next.d1, next.d2, ...h].slice(0, 3));
  };

  const chooseDie = (source: MoveSource) => {
    if (diceRoll && source !== "sum" && sourceMoves(source).length) setActiveSource(source);
  };

  const selectMove = (tokenId: string) => {
    if (!diceRoll || !activeSource) return;
    const move = sourceMoves(activeSource).find((m) => m.tokenId === tokenId);
    if (!move) return;
    const next = applyMove(gameState, move);
    const nextUsed = { ...usedDice, [activeSource]: true } as UsedDice;
    setGameState(next);
    setUsedDice(nextUsed);
    setActiveSource(null);
    setCaptureText("Move!");
    setTimeout(() => setCaptureText(null), 650);
    const remaining = getValidMoves(next, diceRoll).filter((m) => (m.source === "d1" && !nextUsed.d1) || (m.source === "d2" && !nextUsed.d2));
    setValidMoves(remaining);
    if (!remaining.length || next.winner) {
      setDiceRoll(null);
      setUsedDice({ d1: false, d2: false });
      setValidMoves([]);
    }
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#5d351d] text-white select-none" style={{ backgroundImage: "linear-gradient(rgba(70,35,15,.2),rgba(70,35,15,.2)),repeating-linear-gradient(8deg,rgba(35,15,5,.18) 0 3px,transparent 3px 14px)" }}>
      <header className="z-50 mx-auto w-full max-w-[900px] shrink-0 px-3 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button aria-label="Menu" className="grid h-[clamp(44px,12vw,66px)] w-[clamp(44px,12vw,66px)] place-items-center rounded-full bg-[#0969a8] text-[clamp(24px,7vw,38px)] shadow-xl">☰</button>
          <div className="text-[clamp(34px,9vw,62px)] leading-none drop-shadow-lg">👆</div>
          <button aria-label="Close" className="grid h-[clamp(44px,12vw,66px)] w-[clamp(44px,12vw,66px)] place-items-center rounded-full bg-red-600 text-[clamp(28px,8vw,42px)] font-black shadow-xl">×</button>
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <div className="rounded-full bg-[#063f49] px-[clamp(14px,4vw,28px)] py-1.5 text-[clamp(13px,3.5vw,22px)] font-black shadow-md"><span className="text-cyan-300">Me</span>: 0</div>
          <div className="rounded-full bg-[#063f49] px-[clamp(14px,4vw,28px)] py-1.5 text-[clamp(13px,3.5vw,22px)] font-black shadow-md"><span className="text-cyan-300">Player1</span>: 0</div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-2 py-1">
        <div className="flex h-full w-full max-w-[900px] flex-col items-center justify-center gap-[clamp(5px,1.1vh,12px)]">
          <div className="z-50 flex shrink-0 gap-[clamp(8px,2vw,18px)] rounded-full bg-[#073f4a] px-2.5 py-2 shadow-2xl ring-1 ring-white/20">
            <Die value={diceRoll?.d1 ?? 4} used={usedDice.d1} active={activeSource === "d1"} onClick={() => chooseDie("d1")} disabled={!diceRoll || !enabled.d1} />
            <Die value={diceRoll?.d2 ?? 5} used={usedDice.d2} active={activeSource === "d2"} onClick={() => chooseDie("d2")} disabled={!diceRoll || !enabled.d2} />
          </div>
          <div className="relative min-h-0 min-w-0 shrink-0" style={{ width: "min(96vw, calc(100dvh - 250px), 900px)", height: "min(96vw, calc(100dvh - 250px), 900px)" }}>
            <Board players={gameState.players} selectableTokenIds={selectableTokenIds} playerNames={PLAYER_NAMES} onTokenClick={selectMove} showTapHint />
          </div>
        </div>
      </main>

      <footer className="z-50 mx-auto flex w-full max-w-[900px] shrink-0 items-center justify-between gap-2 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        <div className="flex gap-2">{history.map((n, i) => <div key={i} className="grid h-[clamp(40px,11vw,68px)] w-[clamp(40px,11vw,68px)] place-items-center rounded-full border-2 border-white/40 bg-[#146da8] text-[clamp(15px,4vw,26px)] font-black shadow-lg">{n}</div>)}</div>
        <button type="button" onClick={roll} disabled={!!gameState.winner} className="rounded-full bg-[#063f49] px-[clamp(26px,7vw,64px)] py-[clamp(11px,3vw,20px)] text-[clamp(15px,4vw,28px)] font-black shadow-2xl ring-1 ring-white/25">{gameState.winner ? "Winner!" : "Your Turn"}</button>
      </footer>
      <CaptureToast text={captureText} />
    </div>
  );
}
