"use client";

import { useMemo } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import {
  BASE_ZONE, BASE_COORDS, GLOBAL_PATH_COORDS, HOME_STRETCH_COORDS,
  ENTRY_COORDS, COLOR_BG_SOLID, getSafeCoordSet, getRenderCoord,
} from "@/lib/engine/layout";
import Token from "./Token";

const BOARD_SIZE = 15;
type Pos = number | "YARD";
type Cell = { type: "yard" | "path" | "home" | "empty"; color?: PlayerColor; safe?: boolean; entryColor?: PlayerColor; yardSlot?: boolean; homeIndex?: number };
const key = (r: number, c: number) => `${r},${c}`;
const HOME_ARROW: Record<PlayerColor, string> = { RED: "↑", GREEN: "↓", YELLOW: "←", BLUE: "→" };
const CLOCKWISE_ARROWS: Record<string, string> = {
  "1,6": "↑", "3,6": "↑", "5,6": "↑", "0,8": "→", "0,10": "→", "0,12": "→",
  "8,14": "↓", "10,14": "↓", "12,14": "↓", "14,6": "←", "14,8": "←", "14,10": "←",
  "6,0": "→", "8,0": "→",
};

function buildBoard(): Record<string, Cell> {
  const cells: Record<string, Cell> = {};
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) cells[key(r, c)] = { type: "empty" };
  for (const color of ALL_COLORS) {
    const z = BASE_ZONE[color];
    for (let r = z.rowStart; r < z.rowStart + 6; r++) for (let c = z.colStart; c < z.colStart + 6; c++) cells[key(r, c)] = { type: "yard", color };
    BASE_COORDS[color].forEach((p) => { cells[key(p.row, p.col)] = { type: "yard", color, yardSlot: true }; });
  }
  const safe = getSafeCoordSet();
  GLOBAL_PATH_COORDS.forEach((p) => { cells[key(p.row, p.col)] = { type: "path", safe: safe.has(key(p.row, p.col)) }; });
  for (const color of ALL_COLORS) {
    const e = ENTRY_COORDS[color];
    cells[key(e.row, e.col)] = { ...cells[key(e.row, e.col)], entryColor: color };
    HOME_STRETCH_COORDS[color].forEach((p, i) => { cells[key(p.row, p.col)] = { type: "home", color, homeIndex: i }; });
  }
  return cells;
}
const BOARD_CELLS = buildBoard();

interface BoardProps {
  players: Player[];
  selectableTokenIds: Set<string>;
  onTokenClick: (id: string) => void;
  playerNames?: Partial<Record<PlayerColor, string>>;
  playerAvatars?: Partial<Record<PlayerColor, string | undefined>>;
  emptyColors?: Set<PlayerColor>;
  currentTurnColors?: Set<PlayerColor>;
  showTapHint?: boolean;
}

function AvatarCluster({ color, name, avatar, empty, turn }: { color: PlayerColor; name: string; avatar?: string; empty: boolean; turn: boolean }) {
  const z = BASE_ZONE[color];
  return (
    <div className="absolute z-30 pointer-events-none flex items-center justify-center" style={{ top: `${((z.rowStart + 2.65) / BOARD_SIZE) * 100}%`, left: `${((z.colStart + 2.65) / BOARD_SIZE) * 100}%`, width: `${(1.85 / BOARD_SIZE) * 100}%`, height: `${(1.85 / BOARD_SIZE) * 100}%`, transform: "translate(-50%,-50%)" }}>
      <div className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-black/10 shadow-lg ${turn ? "ring-2 ring-amber-300" : ""}`}>
        <div className="absolute -left-[40%] top-[17%] grid aspect-square w-[44%] place-items-center rounded-full border border-black/20 bg-white/90 text-[clamp(8px,2vw,16px)]">🧑🏽</div>
        <div className="absolute -right-[40%] top-[17%] grid aspect-square w-[44%] place-items-center rounded-full border border-black/20 bg-white/90 text-[clamp(8px,2vw,16px)]">👩🏽</div>
        <div className="relative grid h-[76%] w-[76%] place-items-center overflow-hidden rounded-full border-2 border-white bg-black/20 text-[clamp(9px,2.2vw,18px)] font-black text-white">
          {empty ? "+" : avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export default function Board({ players, selectableTokenIds, onTokenClick, playerNames, playerAvatars, emptyColors, currentTurnColors, showTapHint = false }: BoardProps) {
  const tokensByCell = useMemo(() => {
    const grouped: Record<string, { id: string; color: PlayerColor; position: Pos }[]> = {};
    players.forEach((p) => p.tokens.forEach((t, i) => {
      const position = t.position as Pos;
      const coord = getRenderCoord(t.color, position, i);
      const k = key(coord.row, coord.col);
      (grouped[k] ??= []).push({ id: t.id, color: t.color, position });
    }));
    return grouped;
  }, [players]);

  const hint = useMemo(() => {
    const id = Array.from(selectableTokenIds)[0];
    if (!id) return null;
    for (const p of players) {
      const t = p.tokens.find((x) => x.id === id);
      if (t) return getRenderCoord(t.color, t.position as Pos, 0);
    }
    return null;
  }, [selectableTokenIds, players]);

  return (
    <div dir="ltr" className="relative isolate mx-auto grid aspect-square w-full overflow-hidden rounded-[20px] border-[5px] border-slate-950 bg-white shadow-2xl" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE},minmax(0,1fr))`, gridTemplateRows: `repeat(${BOARD_SIZE},minmax(0,1fr))` }} aria-label="Ludo board">
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
        const row = Math.floor(i / BOARD_SIZE), col = i % BOARD_SIZE;
        if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return null;
        const cell = BOARD_CELLS[key(row, col)];
        const tokens = tokensByCell[key(row, col)] ?? [];
        const isHome = cell.type === "home";
        const bg = cell.type === "yard" || isHome ? COLOR_BG_SOLID[cell.color!] : cell.type === "path" && cell.entryColor ? COLOR_BG_SOLID[cell.entryColor] : "bg-white";
        const arrow = CLOCKWISE_ARROWS[key(row, col)];
        return (
          <div key={key(row, col)} style={{ gridRow: row + 1, gridColumn: col + 1 }} className={`relative flex items-center justify-center ${bg} ${cell.type !== "yard" ? "border border-slate-300" : ""}`}>
            {cell.yardSlot && <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/95 bg-white/10 shadow-inner" />}
            {cell.type === "path" && cell.safe && <span className="absolute z-10 font-black text-amber-500" style={{ fontSize: "clamp(10px,3vw,22px)" }}>★</span>}
            {arrow && <span className="absolute z-10 font-black text-slate-800/80" style={{ fontSize: "clamp(10px,3vw,20px)" }}>{arrow}</span>}
            {isHome && cell.homeIndex === 2 && <span className="absolute z-10 font-black text-white/90" style={{ fontSize: "clamp(10px,3vw,20px)" }}>{HOME_ARROW[cell.color!]}</span>}
            {tokens.map((t, j) => {
              const offset = tokens.length > 1 ? ([{ x: -15, y: -15 }, { x: 15, y: -15 }, { x: -15, y: 15 }, { x: 15, y: 15 }][j] ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
              return <div key={t.id} className="absolute inset-0 z-20 pointer-events-none" style={{ transform: `translate(${offset.x}%,${offset.y}%)` }}><Token color={t.color} resting={t.position === "YARD"} selectable={selectableTokenIds.has(t.id)} onClick={() => onTokenClick(t.id)} /></div>;
            })}
          </div>
        );
      })}

      <div className="pointer-events-none absolute left-[40%] top-[40%] z-40 h-[20%] w-[20%] overflow-hidden bg-white" aria-label="Ludo center">
        <div className={`${COLOR_BG_SOLID.GREEN} absolute inset-0`} style={{ clipPath: "polygon(0 0,100% 0,50% 50%)" }} />
        <div className={`${COLOR_BG_SOLID.YELLOW} absolute inset-0`} style={{ clipPath: "polygon(100% 0,100% 100%,50% 50%)" }} />
        <div className={`${COLOR_BG_SOLID.BLUE} absolute inset-0`} style={{ clipPath: "polygon(100% 100%,0 100%,50% 50%)" }} />
        <div className={`${COLOR_BG_SOLID.RED} absolute inset-0`} style={{ clipPath: "polygon(0 100%,0 0,50% 50%)" }} />
        <div className="absolute inset-[13%] grid place-items-center rounded-[18%] border-[3px] border-white/60 bg-gradient-to-br from-sky-400 to-blue-700 shadow-2xl">
          <span className="text-[clamp(14px,4.8vw,42px)] font-black tracking-tight text-white drop-shadow-[0_3px_2px_rgba(0,0,0,.5)]">LUDO</span>
        </div>
      </div>

      {ALL_COLORS.map((color) => <AvatarCluster key={color} color={color} name={playerNames?.[color] ?? color.toLowerCase()} avatar={playerAvatars?.[color]} empty={emptyColors?.has(color) ?? false} turn={currentTurnColors?.has(color) ?? false} />)}

      {ALL_COLORS.map((color) => {
        const z = BASE_ZONE[color];
        return <div key={`label-${color}`} className="absolute z-35 pointer-events-none font-black text-white drop-shadow-[0_2px_1px_rgba(0,0,0,.8)] text-center" style={{ top: `${((z.rowStart + 0.18) / BOARD_SIZE) * 100}%`, left: `${((z.colStart + 1.5) / BOARD_SIZE) * 100}%`, width: `${(3 / BOARD_SIZE) * 100}%`, fontSize: "clamp(10px,3vw,24px)" }}>{playerNames?.[color] ?? color.toLowerCase()}</div>;
      })}

      {showTapHint && hint && <div className="absolute z-[60] pointer-events-none" style={{ top: `${((hint.row + .5) / BOARD_SIZE) * 100}%`, left: `${((hint.col + .5) / BOARD_SIZE) * 100}%`, transform: "translate(-10%,-10%)" }}><div className="text-[clamp(24px,8vw,60px)] leading-none drop-shadow-xl animate-bounce">👆</div></div>}
    </div>
  );
}
