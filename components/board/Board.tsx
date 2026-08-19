"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import {
  BASE_ZONE, BASE_COORDS, GLOBAL_PATH_COORDS, HOME_STRETCH_COORDS, CENTER_COORD,
  ENTRY_COORDS, COLOR_BG_SOLID, COLOR_TEXT_SOLID, getSafeCoordSet, getRenderCoord,
} from "@/lib/engine/layout";
import Token from "./Token";

const BOARD_SIZE = 15;
const STEP_DURATION_MS = 180;
const STACK_OFFSETS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -14, y: -14 }, { x: 14, y: 14 }],
  3: [{ x: -14, y: -14 }, { x: 14, y: -14 }, { x: 0, y: 14 }],
  4: [{ x: -14, y: -14 }, { x: 14, y: -14 }, { x: -14, y: 14 }, { x: 14, y: 14 }],
};
const HOME_ARROW: Record<PlayerColor, string> = { RED: "→", GREEN: "↓", YELLOW: "←", BLUE: "↑" };
type Pos = number | "YARD";
type CellType = "yard" | "path" | "home" | "center" | "empty";
interface Cell { type: CellType; color?: PlayerColor; safe?: boolean; entryColor?: PlayerColor; yardSlot?: boolean; homeIndex?: number; }
interface BoardProps { players: Player[]; selectableTokenIds: Set<string>; onTokenClick: (tokenId: string) => void; onMoveAnimationComplete?: () => void; playerNames?: Partial<Record<PlayerColor, string>>; playerAvatars?: Partial<Record<PlayerColor, string | undefined>>; emptyColors?: Set<PlayerColor>; disconnectedColors?: Set<PlayerColor>; currentTurnColors?: Set<PlayerColor>; onCapture?: (info: { tokenId: string; color: PlayerColor }) => void; }
interface Flash { id: string; color: PlayerColor; row: number; col: number; }
function key(row: number, col: number) { return `${row},${col}`; }
function buildUnifiedBoard(): Record<string, Cell> {
  const cells: Record<string, Cell> = {};
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) cells[key(row, col)] = { type: "empty" };
  for (const color of ALL_COLORS) {
    const zone = BASE_ZONE[color];
    for (let row = zone.rowStart; row < zone.rowStart + 6; row++) for (let col = zone.colStart; col < zone.colStart + 6; col++) cells[key(row, col)] = { type: "yard", color };
    BASE_COORDS[color].forEach((coord) => { cells[key(coord.row, coord.col)] = { type: "yard", color, yardSlot: true }; });
  }
  const safe = getSafeCoordSet();
  GLOBAL_PATH_COORDS.forEach((coord) => { cells[key(coord.row, coord.col)] = { type: "path", safe: safe.has(key(coord.row, coord.col)) }; });
  for (const color of ALL_COLORS) {
    const entry = ENTRY_COORDS[color];
    cells[key(entry.row, entry.col)] = { ...cells[key(entry.row, entry.col)], entryColor: color };
    HOME_STRETCH_COORDS[color].forEach((coord, index) => { cells[key(coord.row, coord.col)] = { type: "home", color, homeIndex: index }; });
  }
  cells[key(CENTER_COORD.row, CENTER_COORD.col)] = { type: "center" };
  return cells;
}
const BOARD_CELLS = buildUnifiedBoard();
function BoardToken({ id, color, position, selectable, offset, onClick }: { id: string; color: PlayerColor; position: Pos; selectable: boolean; offset: { x: number; y: number }; onClick: () => void; }) {
  return <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${offset.x}%, ${offset.y}%)`, zIndex: 20 }}><div className="pointer-events-auto w-[88%] h-[88%] flex items-center justify-center"><Token color={color} resting={position === "YARD"} selectable={selectable} onClick={onClick} /></div></div>;
}
export default function Board({ players, selectableTokenIds, onTokenClick, onMoveAnimationComplete, playerNames, playerAvatars, emptyColors, disconnectedColors, currentTurnColors, onCapture }: BoardProps) {
  const [displayPositions, setDisplayPositions] = useState<Record<string, Pos>>(() => { const initial: Record<string, Pos> = {}; players.forEach((player) => player.tokens.forEach((token) => { initial[token.id] = token.position; })); return initial; });
  const previousPositions = useRef<Record<string, Pos>>(displayPositions); const completeRef = useRef(onMoveAnimationComplete); const captureRef = useRef(onCapture); const [flashes, setFlashes] = useState<Flash[]>([]); const flashId = useRef(0);
  useEffect(() => { completeRef.current = onMoveAnimationComplete; }, [onMoveAnimationComplete]); useEffect(() => { captureRef.current = onCapture; }, [onCapture]);
  useEffect(() => {
    const next: Record<string, Pos> = {}; const colors: Record<string, PlayerColor> = {}; players.forEach((player) => player.tokens.forEach((token) => { next[token.id] = token.position; colors[token.id] = token.color; }));
    const prev = previousPositions.current; const timers: ReturnType<typeof setTimeout>[] = []; let animations = 0; let changed = false; const newFlashes: Flash[] = [];
    const finish = () => { animations -= 1; if (animations === 0) completeRef.current?.(); };
    const animateForward = (id: string, from: number, to: number) => { animations += 1; let step = from; const tick = () => { step += 1; setDisplayPositions((current) => ({ ...current, [id]: step })); if (step < to) timers.push(setTimeout(tick, STEP_DURATION_MS)); else finish(); }; timers.push(setTimeout(tick, STEP_DURATION_MS)); };
    Object.entries(next).forEach(([id, newPos]) => { const oldPos = prev[id]; if (oldPos === newPos) return; changed = true; if (oldPos === "YARD" && typeof newPos === "number") { setDisplayPositions((current) => ({ ...current, [id]: 0 })); if (newPos === 0) return; animateForward(id, 0, newPos); return; } if (typeof oldPos === "number" && typeof newPos === "number" && newPos > oldPos) { animateForward(id, oldPos, newPos); return; } if (typeof oldPos === "number" && newPos === "YARD") { const color = colors[id]; const coord = getRenderCoord(color, oldPos, 0); flashId.current += 1; newFlashes.push({ id: `${id}-${flashId.current}`, color, row: coord.row, col: coord.col }); captureRef.current?.({ tokenId: id, color }); } setDisplayPositions((current) => ({ ...current, [id]: newPos })); });
    previousPositions.current = next;
    if (newFlashes.length) { setFlashes((current) => [...current, ...newFlashes]); const ids = new Set(newFlashes.map((flash) => flash.id)); timers.push(setTimeout(() => setFlashes((current) => current.filter((flash) => !ids.has(flash.id))), 650)); }
    if (changed && animations === 0) timers.push(setTimeout(() => completeRef.current?.(), 0));
    return () => timers.forEach(clearTimeout);
  }, [players]);
  const tokensByCell = useMemo(() => { const grouped: Record<string, { id: string; color: PlayerColor; position: Pos; index: number }[]> = {}; players.forEach((player) => player.tokens.forEach((token, index) => { const position = displayPositions[token.id] ?? token.position; const coord = getRenderCoord(token.color, position, index); const cellKey = key(coord.row, coord.col); (grouped[cellKey] ||= []).push({ id: token.id, color: token.color, position, index }); })); return grouped; }, [players, displayPositions]);
  return <div dir="ltr" className="relative isolate grid w-full max-w-[720px] aspect-square mx-auto overflow-hidden rounded-[22px] border-[5px] border-slate-950 bg-white shadow-2xl" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }} aria-label="Ludo board">
    {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => { const row = Math.floor(index / BOARD_SIZE); const col = index % BOARD_SIZE; const cell = BOARD_CELLS[key(row, col)]; const tokens = tokensByCell[key(row, col)] || []; const centerRegion = row >= 6 && row <= 8 && col >= 6 && col <= 8; const isCenter = row === CENTER_COORD.row && col === CENTER_COORD.col; const isHome = cell.type === "home"; const homeIndex = cell.homeIndex ?? -1; const bg = cell.type === "yard" || isHome ? COLOR_BG_SOLID[cell.color!] : cell.type === "path" && cell.entryColor ? COLOR_BG_SOLID[cell.entryColor] : "bg-white"; return <div key={key(row, col)} style={{ gridRow: row + 1, gridColumn: col + 1 }} className={`relative flex items-center justify-center ${centerRegion ? "bg-transparent" : bg} ${cell.type !== "yard" && !centerRegion ? "border border-slate-300" : ""}`}>
      {cell.yardSlot && tokens.length === 0 && <div className="absolute w-[72%] h-[72%] rounded-full border-[3px] border-white/75 bg-black/10" />}
      {cell.type === "path" && cell.safe && <span className={`absolute font-black drop-shadow-sm ${cell.entryColor ? "text-white" : "text-amber-500"}`} style={{ fontSize: "min(3.5vw, 17px)" }}>★</span>}
      {isHome && homeIndex === 2 && <span className="absolute z-[2] text-white/80 font-black pointer-events-none" style={{ fontSize: "min(2.8vw, 13px)" }}>{HOME_ARROW[cell.color!]}</span>}
      {tokens.map((token, stackIndex) => { const stackSize = Math.min(tokens.length, 4); const offset = STACK_OFFSETS[stackSize]?.[stackIndex] ?? { x: 0, y: 0 }; return <BoardToken key={token.id} id={token.id} color={token.color} position={token.position} selectable={selectableTokenIds.has(token.id)} offset={offset} onClick={() => onTokenClick(token.id)} />; })}
      {isCenter && <div className="absolute inset-0 z-[3] overflow-hidden"><div className={`absolute inset-0 ${COLOR_BG_SOLID.RED}`} style={{ clipPath: "polygon(0 0, 100% 0, 50% 50%)" }} /><div className={`absolute inset-0 ${COLOR_BG_SOLID.GREEN}`} style={{ clipPath: "polygon(100% 0, 100% 100%, 50% 50%)" }} /><div className={`absolute inset-0 ${COLOR_BG_SOLID.YELLOW}`} style={{ clipPath: "polygon(100% 100%, 0 100%, 50% 50%)" }} /><div className={`absolute inset-0 ${COLOR_BG_SOLID.BLUE}`} style={{ clipPath: "polygon(0 100%, 0 0, 50% 50%)" }} /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[24%] h-[24%] rounded-full bg-white/90 shadow-lg" /></div></div>}
    </div>; })}
    {ALL_COLORS.map((color) => { const zone = BASE_ZONE[color]; const name = playerNames?.[color] ?? color.charAt(0) + color.slice(1).toLowerCase(); const avatarUrl = playerAvatars?.[color]; const empty = emptyColors?.has(color) ?? false; const disconnected = disconnectedColors?.has(color) ?? false; const turn = currentTurnColors?.has(color) ?? false; return <div key={`player-${color}`} className="absolute z-[8] pointer-events-none flex items-center justify-center" style={{ top: `${((zone.rowStart + 2) / BOARD_SIZE) * 100}%`, left: `${((zone.colStart + 2) / BOARD_SIZE) * 100}%`, width: `${(2 / BOARD_SIZE) * 100}%`, height: `${(2 / BOARD_SIZE) * 100}%` }}>{empty ? <div className="w-full h-full rounded-full border-[2px] border-dashed border-white/70 bg-black/20 flex items-center justify-center text-white font-black text-lg">+</div> : <div className={`relative w-full h-full rounded-full overflow-hidden border-[3px] border-white shadow-lg ${turn ? "ring-4 ring-amber-300" : ""} ${disconnected ? "opacity-40 grayscale" : ""}`} title={name}>{avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${COLOR_BG_SOLID[color]} flex items-center justify-center text-white font-black`} style={{ fontSize: "min(5vw, 24px)" }}>{name.charAt(0).toUpperCase()}</div>}</div>}</div>; })}
    {flashes.map((flash) => <div key={flash.id} className="absolute z-[30] pointer-events-none" style={{ top: `${((flash.row + 0.5) / BOARD_SIZE) * 100}%`, left: `${((flash.col + 0.5) / BOARD_SIZE) * 100}%`, transform: "translate(-50%, -50%)" }}><div className={`w-10 h-10 rounded-full ${COLOR_BG_SOLID[flash.color]} animate-ping opacity-80`} /></div>)}
  </div>;
}
